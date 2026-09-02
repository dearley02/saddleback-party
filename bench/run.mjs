#!/usr/bin/env node
// Benchmark harness CLI. See bench/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUNS_DIR, createWorkspace, makeCtx, applyOps, diffStat } from './lib/workspace.mjs';
import { gradeTask } from './lib/checks.mjs';
import { formatTaskResult, summaryMarkdown } from './lib/report.mjs';
import { TASKS, selectTasks } from './tasks/index.mjs';

const USAGE = `
Usage: node bench/run.mjs <command> [options]

  list                                  show every task
  setup <task> [--tag NAME]             build a workspace + PROMPT.md for a task (solve it by hand, then grade)
  grade <task> --workspace DIR          grade a workspace; writes result.json next to it
  run <task|category|all> --solver CMD  setup -> run solver in the workspace -> grade, for each task
        [--tag NAME] [--timeout MIN]    CMD may use {prompt_file} {workspace} {task_id}; env BENCH_* is set too
  validate [task|category|all]          self-test: baseline must fail, reference solution must score 100%
  clean                                 delete bench/runs/

<task> is a full id (analytics/tracking-consolidation), a category prefix (analytics), or "all".
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      args[k] = next !== undefined && !next.startsWith('--') ? argv[++i] : true;
    } else args._.push(a);
  }
  return args;
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runDirFor = (tag, task) => path.join(RUNS_DIR, tag, task.id.replace('/', '__'));

function runSolver(solver, task, runDir, ws, timeoutMin) {
  const promptFile = path.join(runDir, 'PROMPT.md');
  const cmd = solver.replaceAll('{prompt_file}', promptFile).replaceAll('{workspace}', ws).replaceAll('{task_id}', task.id);
  const t0 = Date.now();
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ws, encoding: 'utf8', timeout: timeoutMin * 60_000, maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, BENCH_TASK_ID: task.id, BENCH_PROMPT_FILE: promptFile, BENCH_WORKSPACE: ws },
  });
  fs.writeFileSync(path.join(runDir, 'solver.log'), `$ ${cmd}\n\n--- stdout ---\n${r.stdout || ''}\n--- stderr ---\n${r.stderr || ''}\n`);
  return { cmd, exitCode: r.status, durationMs: Date.now() - t0, timedOut: r.error?.code === 'ETIMEDOUT' };
}

function writeResult(runDir, task, result, extra = {}) {
  const out = { task: { id: task.id, category: task.category, title: task.title, difficulty: task.difficulty }, gradedAt: new Date().toISOString(), ...extra, result };
  fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(out, null, 2));
  return out;
}

async function cmdList() {
  console.log('id'.padEnd(40), 'category'.padEnd(36), 'difficulty', 'checks', 'budget');
  for (const t of TASKS) {
    console.log(t.id.padEnd(40), t.category.padEnd(36), t.difficulty.padEnd(10), String(t.checks.length).padStart(6), `${t.timeBudgetMin}m`.padStart(6));
  }
}

async function cmdSetup(args) {
  const [task] = selectTasks(args._[1]);
  const runDir = runDirFor(args.tag || stamp(), task);
  fs.mkdirSync(runDir, { recursive: true });
  const ws = createWorkspace(task, runDir);
  console.log(`workspace: ${ws}\nprompt:    ${path.join(runDir, 'PROMPT.md')}\n\nSolve it, then:\n  node bench/run.mjs grade ${task.id} --workspace "${ws}"`);
}

async function cmdGrade(args) {
  const [task] = selectTasks(args._[1]);
  if (!args.workspace) throw new Error('--workspace DIR is required');
  const ws = path.resolve(args.workspace);
  const res = await gradeTask(task, makeCtx(ws));
  const diff = diffStat(ws);
  console.log(formatTaskResult(task, res, { diff }));
  writeResult(path.dirname(ws), task, res, { workspace: ws, diff });
  process.exitCode = res.passed ? 0 : 1;
}

async function cmdRun(args) {
  const tasks = selectTasks(args._[1] || 'all');
  const solver = typeof args.solver === 'string' ? args.solver : null;
  const tag = args.tag || stamp();
  const timeoutMin = Number(args.timeout) || 30;
  const results = [];
  for (const task of tasks) {
    const runDir = runDirFor(tag, task);
    fs.mkdirSync(runDir, { recursive: true });
    const ws = createWorkspace(task, runDir);
    let solverInfo = null;
    if (solver) {
      console.log(`\n>> ${task.id}: running solver (timeout ${timeoutMin}m)`);
      solverInfo = runSolver(solver, task, runDir, ws, timeoutMin);
    } else {
      console.log(`\n>> ${task.id}: no --solver given, grading the untouched workspace (baseline)`);
    }
    const res = await gradeTask(task, makeCtx(ws));
    const diff = diffStat(ws);
    console.log(formatTaskResult(task, res, { solver: solverInfo, diff }));
    results.push({ task, result: res, solver: solverInfo, diff, runDir });
    writeResult(runDir, task, res, { workspace: ws, solver: solverInfo, diff });
  }
  const summaryDir = path.join(RUNS_DIR, tag);
  const md = summaryMarkdown(results, { tag, solver });
  fs.writeFileSync(path.join(summaryDir, 'summary.md'), md);
  fs.writeFileSync(path.join(summaryDir, 'summary.json'), JSON.stringify(results.map(r => ({
    task: r.task.id, category: r.task.category, score: r.result.score, passed: r.result.passed,
    solver: r.solver, diff: r.diff, checks: r.result.checks, runDir: r.runDir,
  })), null, 2));
  console.log(`\n${md}\nSummary written to ${summaryDir}/summary.md`);
}

async function cmdValidate(args) {
  const tasks = selectTasks(args._[1] || 'all');
  const problems = [];
  for (const task of tasks) {
    const runDir = runDirFor('validate', task);
    fs.mkdirSync(runDir, { recursive: true });
    const ws = createWorkspace(task, runDir);
    const ctx = makeCtx(ws);
    const base = await gradeTask(task, ctx);
    let ref = null;
    if (task.reference) {
      try {
        applyOps(ctx, Array.isArray(task.reference) ? task.reference : [{ op: 'fn', run: task.reference }]);
        ref = await gradeTask(task, ctx);
      } catch (e) {
        problems.push(`${task.id}: reference solution threw: ${e.message}`);
      }
    } else problems.push(`${task.id}: no reference solution`);

    console.log(`\n== ${task.id}   baseline ${Math.round(base.score * 100)}%${ref ? `   reference ${Math.round(ref.score * 100)}%` : ''}`);
    for (let i = 0; i < base.checks.length; i++) {
      const b = base.checks[i], r = ref?.checks[i];
      const notes = [];
      if (b.pass && !b.expectBaselinePass) notes.push('FREE (passes before any work)');
      if (!b.pass && b.expectBaselinePass) notes.push('BASELINE-BROKEN (regression guard fails before any work)');
      if (r && !r.pass) notes.push(`BROKEN (reference fails: ${r.detail || 'no detail'})`);
      for (const n of notes) problems.push(`${task.id}/${b.id}: ${n}`);
      console.log(`   ${b.id.padEnd(20)} baseline ${b.pass ? 'pass' : 'fail'}   reference ${r ? (r.pass ? 'pass' : 'FAIL') : '-'}   ${notes.join('; ')}`);
    }
    if (base.passed) problems.push(`${task.id}: baseline already passes the task threshold`);
    if (ref && !ref.passed) problems.push(`${task.id}: reference solution does not pass the task`);
  }
  console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n  ${problems.join('\n  ')}` : '\nAll tasks validated: baselines fail, references score 100%.');
  process.exitCode = problems.length ? 1 : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  try {
    if (cmd === 'list') await cmdList();
    else if (cmd === 'setup') await cmdSetup(args);
    else if (cmd === 'grade') await cmdGrade(args);
    else if (cmd === 'run') await cmdRun(args);
    else if (cmd === 'validate') await cmdValidate(args);
    else if (cmd === 'clean') { fs.rmSync(RUNS_DIR, { recursive: true, force: true }); console.log(`removed ${RUNS_DIR}`); }
    else { console.log(USAGE.trim()); process.exitCode = cmd ? 1 : 0; }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exitCode = 1;
  }
}
main();
