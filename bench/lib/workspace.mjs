// Workspace + context helpers for the benchmark harness.
// A workspace is a throwaway copy of the site (tracked + untracked, minus bench/)
// with the task's setup mutations applied and a fresh git baseline committed,
// so a solver's changes are always visible via `git diff` inside it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RUNS_DIR = path.join(ROOT, 'bench', 'runs');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'bench']);

export function listSourceFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT });
  return out.toString().split('\0').filter(Boolean)
    .filter(f => !f.startsWith('bench/') && fs.existsSync(path.join(ROOT, f)));
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, stdio: 'pipe' }).toString();
}

export function renderPrompt(task) {
  return [
    `# ${task.title}`,
    '',
    `Category: ${task.category}  -  Difficulty: ${task.difficulty}  -  Time budget: ~${task.timeBudgetMin} min`,
    '',
    task.prompt.trim(),
    '',
    '---',
    'Work only inside this directory (it is a self-contained copy of the site with a git baseline committed).',
    'Do not modify anything outside it. When you are done, stop; the harness grades the working tree as-is.',
    '',
  ].join('\n');
}

export function createWorkspace(task, runDir) {
  const ws = path.join(runDir, 'workspace');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  for (const rel of listSourceFiles()) {
    const dest = path.join(ws, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
  const nm = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nm)) fs.symlinkSync(nm, path.join(ws, 'node_modules'), 'dir');
  const ctx = makeCtx(ws);
  applyOps(ctx, task.setup || []);
  git(ws, ['init', '-q']);
  git(ws, ['add', '-A']);
  git(ws, ['-c', 'user.name=bench', '-c', 'user.email=bench@localhost', 'commit', '-q', '-m', 'bench baseline']);
  fs.writeFileSync(path.join(runDir, 'PROMPT.md'), renderPrompt(task));
  return ws;
}

export function diffStat(ws) {
  try {
    const stat = git(ws, ['diff', '--shortstat', 'HEAD']).trim();
    const untracked = git(ws, ['ls-files', '--others', '--exclude-standard']).trim().split('\n').filter(Boolean);
    return { tracked: stat || '(no tracked changes)', newFiles: untracked };
  } catch (e) { return { tracked: `error: ${e.message}`, newFiles: [] }; }
}

// --- setup / reference mutation ops -------------------------------------------------
// { op:'replace', path, from: string|RegExp, to, all?, optional? }
// { op:'delete', path } | { op:'write', path, content } | { op:'append', path, content }
// { op:'copy', from, to, replace?: [[from,to],...] } | { op:'fn', run: (ctx) => void }
export function applyOps(ctx, ops) {
  for (const o of ops) {
    switch (o.op) {
      case 'replace': {
        let s = ctx.read(o.path);
        const found = o.from instanceof RegExp ? o.from.test(s) : s.includes(o.from);
        if (!found) {
          if (o.optional) break;
          throw new Error(`replace: pattern not found in ${o.path}: ${String(o.from).slice(0, 80)}`);
        }
        if (o.from instanceof RegExp) {
          const re = o.all && !o.from.global ? new RegExp(o.from.source, o.from.flags + 'g') : o.from;
          s = s.replace(re, o.to);
        } else {
          s = o.all ? s.split(o.from).join(o.to) : s.replace(o.from, () => o.to);
        }
        ctx.write(o.path, s);
        break;
      }
      case 'delete': fs.rmSync(ctx.path(o.path), { recursive: true, force: true }); break;
      case 'write': ctx.write(o.path, o.content); break;
      case 'append': ctx.write(o.path, (ctx.exists(o.path) ? ctx.read(o.path) : '') + o.content); break;
      case 'copy': {
        let s = ctx.read(o.from);
        for (const [a, b] of o.replace || []) s = s.split(a).join(b);
        ctx.write(o.to, s);
        break;
      }
      case 'fn': o.run(ctx); break;
      default: throw new Error(`unknown op ${o.op}`);
    }
  }
}

// --- glob (tiny, dependency-free) -----------------------------------------------------
function walk(dir, base, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isSymbolicLink()) continue;
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) { if (!SKIP_DIRS.has(ent.name)) walk(path.join(dir, ent.name), rel, out); }
    else out.push(rel);
  }
  return out;
}
function globToRegex(p) {
  const esc = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\x01')
    .replace(/\*/g, '[^/]*')
    .replace(/\x01/g, '(?:.*/)?');
  return new RegExp(`^${esc}$`);
}
export function globSync(ws, patterns) {
  const pats = (Array.isArray(patterns) ? patterns : [patterns]).map(globToRegex);
  return walk(ws, '', []).filter(f => pats.some(r => r.test(f))).sort();
}

// --- context passed to checks / ops ---------------------------------------------------
export function makeCtx(ws) {
  const ctx = {
    ws,
    path: p => path.join(ws, p),
    exists: p => fs.existsSync(path.join(ws, p)),
    read: p => fs.readFileSync(path.join(ws, p), 'utf8'),
    write: (p, c) => { fs.mkdirSync(path.dirname(path.join(ws, p)), { recursive: true }); fs.writeFileSync(path.join(ws, p), c); },
    glob: patterns => globSync(ws, patterns),
    exec: (cmd, { timeoutMs = 180_000, cwd = ws } = {}) => {
      const r = spawnSync('bash', ['-lc', cmd], {
        cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, CI: '1' },
      });
      return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', timedOut: r.error?.code === 'ETIMEDOUT' };
    },
    // A pristine checkout of the workspace's baseline commit (what the solver started from),
    // rebuilt on every call so it can never go stale. Used for "no new errors" style gates.
    baselineDir: () => {
      const dir = path.join(ws, '..', 'baseline');
      fs.rmSync(dir, { recursive: true, force: true });
      execFileSync('git', ['worktree', 'prune'], { cwd: ws, stdio: 'pipe' });
      execFileSync('git', ['worktree', 'add', '--detach', dir, 'HEAD'], { cwd: ws, stdio: 'pipe' });
      const nm = path.join(ws, 'node_modules');
      if (fs.existsSync(nm)) fs.symlinkSync(fs.realpathSync(nm), path.join(dir, 'node_modules'), 'dir');
      return dir;
    },
    stripComments: s => s.replace(/<!--[\s\S]*?-->/g, ''),
    pages: () => globSync(ws, 'public/*.html'),
    slug: file => path.basename(file, '.html'),
    jsonld: p => {
      const html = ctx.stripComments(ctx.read(p));
      const blocks = [];
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(html))) {
        try { blocks.push(JSON.parse(m[1])); } catch (e) { blocks.push({ __parseError: e.message }); }
      }
      return blocks;
    },
    sitemapUrls: () => [...ctx.read('public/sitemap.xml').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]),
    meta: (html, name) => {
      const tag = html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i'));
      return tag ? (tag[0].match(/content=["']([^"']*)["']/i) || [])[1] ?? null : null;
    },
    prop: (html, property) => {
      const tag = html.match(new RegExp(`<meta\\s+[^>]*property=["']${property}["'][^>]*>`, 'i'));
      return tag ? (tag[0].match(/content=["']([^"']*)["']/i) || [])[1] ?? null : null;
    },
    canonical: html => (
      html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)
      || []
    )[1] ?? null,
    title: html => ((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] ?? '').trim(),
    h1: html => ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] ?? '').replace(/<[^>]+>/g, '').trim(),
    count: (s, pattern) => {
      if (pattern instanceof RegExp) {
        const re = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
        return (s.match(re) || []).length;
      }
      return s.split(pattern).length - 1;
    },
  };
  return ctx;
}
