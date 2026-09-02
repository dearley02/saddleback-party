// Declarative check runner. Every check resolves to { pass, detail }.
//
// Check types:
//   exists / absent      { path }
//   contains             { path, pattern: string|RegExp, min=1, max? }
//   not_contains         { path, pattern }
//   each                 { glob, pattern, exclude?, min=1 }   every matched file contains pattern
//   none                 { glob, pattern, exclude? }          no matched file contains pattern
//   sitemap              { includes?: [path], excludes?: [path] }
//   jsonld               { path, test: (blocks, ctx) => bool|string|{pass,detail} }
//   command              { cmd, timeoutMs?, expect?: RegExp tested against stdout }
//   fn                   { test: (ctx) => bool|string|{pass,detail} }
//
// A test that returns a string is a failure with that string as the detail.
// Common fields: id, name, weight (default 1), required (task fails if this fails),
// expectBaselinePass (regression guard — expected to pass before the solver touches anything).
import { SITE } from './site.mjs';

function normalize(r) {
  if (r === true) return { pass: true, detail: '' };
  if (r === false || r == null) return { pass: false, detail: '' };
  if (typeof r === 'string') return { pass: false, detail: r };
  return { pass: !!r.pass, detail: r.detail ?? '' };
}

function matched(ctx, check) {
  const ex = new Set(check.exclude || []);
  return ctx.glob(check.glob).filter(f => !ex.has(f));
}

async function impl(check, ctx) {
  switch (check.type) {
    case 'exists': return ctx.exists(check.path) || `${check.path} does not exist`;
    case 'absent': return !ctx.exists(check.path) || `${check.path} should not exist`;
    case 'contains': {
      if (!ctx.exists(check.path)) return `${check.path} missing`;
      const n = ctx.count(ctx.read(check.path), check.pattern);
      const min = check.min ?? 1, max = check.max ?? Infinity;
      if (n >= min && n <= max) return { pass: true, detail: `${n} match(es)` };
      return `${n} match(es) of ${String(check.pattern).slice(0, 70)} (want ${min}${max !== Infinity ? '-' + max : '+'})`;
    }
    case 'not_contains': {
      if (!ctx.exists(check.path)) return `${check.path} missing`;
      const n = ctx.count(ctx.read(check.path), check.pattern);
      return n === 0 || `${n} unexpected match(es) of ${String(check.pattern).slice(0, 70)}`;
    }
    case 'each': {
      const files = matched(ctx, check);
      if (!files.length) return `no files matched ${check.glob}`;
      const bad = files.filter(f => ctx.count(ctx.read(f), check.pattern) < (check.min ?? 1));
      return bad.length === 0 ? { pass: true, detail: `${files.length} files ok` } : `missing in: ${bad.join(', ')}`;
    }
    case 'none': {
      const files = matched(ctx, check);
      const bad = files.filter(f => ctx.count(ctx.read(f), check.pattern) > 0);
      return bad.length === 0 ? { pass: true, detail: `${files.length} files clean` } : `still present in: ${bad.join(', ')}`;
    }
    case 'sitemap': {
      if (!ctx.exists('public/sitemap.xml')) return 'sitemap missing';
      const urls = new Set(ctx.sitemapUrls());
      const miss = (check.includes || []).map(p => SITE + p).filter(u => !urls.has(u));
      const extra = (check.excludes || []).map(p => SITE + p).filter(u => urls.has(u));
      if (miss.length || extra.length) {
        return [miss.length ? `missing ${miss.join(', ')}` : '', extra.length ? `should not list ${extra.join(', ')}` : ''].filter(Boolean).join('; ');
      }
      return true;
    }
    case 'jsonld': {
      if (!ctx.exists(check.path)) return `${check.path} missing`;
      const blocks = ctx.jsonld(check.path);
      const broken = blocks.filter(b => b.__parseError);
      if (broken.length) return `invalid JSON-LD: ${broken[0].__parseError}`;
      return check.test(blocks, ctx);
    }
    case 'command': {
      const r = ctx.exec(check.cmd, { timeoutMs: check.timeoutMs });
      if (r.timedOut) return `timed out: ${check.cmd}`;
      if (r.code !== 0) return `exit ${r.code}: ${(r.stderr || r.stdout).trim().split('\n').slice(-6).join(' | ').slice(0, 400)}`;
      if (check.expect && !check.expect.test(r.stdout)) return `stdout did not match ${check.expect}`;
      return true;
    }
    case 'fn': return check.test(ctx);
    case 'lint_delta': {
      // Pass when ESLint reports no errors that were not already present at the baseline commit.
      // (The site has a couple of pre-existing lint errors; solvers must not add to them.)
      const errorsIn = dir => {
        const r = ctx.exec('npx eslint . -f json', { cwd: dir, timeoutMs: check.timeoutMs });
        let files;
        try { files = JSON.parse(r.stdout); } catch { throw new Error(`eslint produced no JSON (exit ${r.code}): ${(r.stderr || r.stdout).trim().slice(0, 200)}`); }
        const counts = new Map();
        for (const f of files) {
          const rel = f.filePath.startsWith(dir) ? f.filePath.slice(dir.length + 1) : f.filePath;
          for (const m of f.messages) {
            if (m.severity !== 2) continue;
            const key = `${rel} | ${m.ruleId || m.message.split('\n')[0]}`;
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        }
        return counts;
      };
      const now = errorsIn(ctx.ws), base = errorsIn(ctx.baselineDir());
      const added = [...now].filter(([k, n]) => n > (base.get(k) || 0)).map(([k, n]) => `${k} (+${n - (base.get(k) || 0)})`);
      const preexisting = [...base.values()].reduce((a, b) => a + b, 0);
      return added.length ? `new lint errors: ${added.join('; ')}` : { pass: true, detail: preexisting ? `no new errors (${preexisting} pre-existing)` : 'clean' };
    }
    default: throw new Error(`unknown check type ${check.type}`);
  }
}

export async function runCheck(check, ctx) {
  try { return normalize(await impl(check, ctx)); }
  catch (e) { return { pass: false, detail: `grader error: ${e.message}` }; }
}

export async function gradeTask(task, ctx) {
  const checks = [];
  for (const c of task.checks) {
    const r = await runCheck(c, ctx);
    checks.push({ id: c.id, name: c.name, weight: c.weight ?? 1, required: !!c.required, expectBaselinePass: !!c.expectBaselinePass, ...r });
  }
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  const score = total ? got / total : 0;
  const requiredOk = checks.filter(c => c.required).every(c => c.pass);
  const threshold = task.passThreshold ?? 0.8;
  return { score, passed: score >= threshold && requiredOk, requiredOk, threshold, checks };
}
