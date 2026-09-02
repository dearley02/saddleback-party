const pct = x => `${Math.round(x * 100)}%`;
const mark = p => (p ? 'PASS' : 'FAIL');

export function formatTaskResult(task, res, extra = {}) {
  const lines = [];
  lines.push(`\n== ${task.id} - ${task.title}`);
  lines.push(`   ${task.category} | score ${pct(res.score)} (threshold ${pct(res.threshold)}) | ${res.passed ? 'PASSED' : 'FAILED'}${res.requiredOk ? '' : ' (required check failed)'}`);
  if (extra.solver) lines.push(`   solver: exit ${extra.solver.exitCode} | ${(extra.solver.durationMs / 1000).toFixed(0)}s${extra.solver.timedOut ? ' | TIMED OUT' : ''}`);
  if (extra.diff) lines.push(`   diff: ${extra.diff.tracked}${extra.diff.newFiles?.length ? ` | new files: ${extra.diff.newFiles.join(', ')}` : ''}`);
  for (const c of res.checks) {
    lines.push(`   [${mark(c.pass)}] ${c.id.padEnd(20)} ${c.name}${c.required ? ' (required)' : ''}${c.weight !== 1 ? ` (x${c.weight})` : ''}${c.detail ? `\n          ${c.detail}` : ''}`);
  }
  return lines.join('\n');
}

export function summaryMarkdown(results, meta = {}) {
  const rows = results.map(r => {
    const failed = r.result.checks.filter(c => !c.pass).map(c => c.id).join(', ') || '-';
    const time = r.solver ? `${(r.solver.durationMs / 1000).toFixed(0)}s` : '-';
    return `| ${r.task.id} | ${r.task.category} | ${pct(r.result.score)} | ${r.result.passed ? 'yes' : 'no'} | ${time} | ${failed} |`;
  });
  const byCat = {};
  for (const r of results) (byCat[r.task.category] ??= []).push(r.result.score);
  const catRows = Object.entries(byCat).map(([c, s]) => `| ${c} | ${s.length} | ${pct(s.reduce((a, b) => a + b, 0) / s.length)} |`);
  const overall = results.length ? results.reduce((a, r) => a + r.result.score, 0) / results.length : 0;
  return [
    `# Benchmark summary${meta.tag ? ` - ${meta.tag}` : ''}`,
    '',
    `Generated ${new Date().toISOString()}${meta.solver ? ` | solver: \`${meta.solver}\`` : ''}`,
    '',
    `**Overall: ${pct(overall)}** | ${results.filter(r => r.result.passed).length}/${results.length} tasks passed`,
    '',
    '## By category', '', '| Category | Tasks | Mean score |', '|---|---:|---:|', ...catRows, '',
    '## By task', '', '| Task | Category | Score | Passed | Solver time | Failed checks |', '|---|---|---:|:-:|---:|---|', ...rows, '',
  ].join('\n');
}
