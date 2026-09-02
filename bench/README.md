# Saddleback benchmark harness

A benchmark of **10 multi-step tasks** across the five categories of work this repo actually sees
(see `TASK-CATEGORIES.md`). Each task is graded automatically against the real site code, so it can be
used to compare coding agents, prompts, models, or a human baseline on work that looks like *your* work.

| Category | Tasks |
|---|---|
| Analytics & conversion tracking | `analytics/tracking-consolidation`, `analytics/event-taxonomy` |
| Local SEO landing pages | `seo-pages/new-city-page`, `seo-pages/service-cluster` |
| Storefront UI build & maintenance | `storefront/product-line`, `storefront/quote-form-hardening` |
| Lead capture & paid-ad funnel | `funnel/ads-landing-page`, `funnel/conversion-repair` |
| Technical SEO & hosting config | `technical-seo/crawl-audit`, `technical-seo/edge-config` |

Every task requires 5-13 coordinated changes across HTML pages, `src/App.jsx`, config and docs, and most
end with `npm run build` / `npm run lint` / `npm test` as required gates. Several tasks start from a
deliberately broken workspace (the "setup" mutations) and give the solver only symptoms, not the fix list.

## Quick start

```bash
npm ci                              # once; the harness symlinks node_modules into each workspace
npm run bench -- list               # show the tasks
npm run bench -- validate           # self-test: every baseline must fail, every reference solution must score 100%
```

Run the whole suite with a solver command. The command runs **inside the task workspace** with the
prompt available as `$BENCH_PROMPT_FILE` (also `{prompt_file}`, `{workspace}`, `{task_id}` placeholders):

```bash
# Claude Code, non-interactive
npm run bench -- run all --tag opus-run1 \
  --solver 'claude -p "$(cat "$BENCH_PROMPT_FILE")" --permission-mode acceptEdits'

# one category, or one task
npm run bench -- run funnel --solver '...'
npm run bench -- run seo-pages/new-city-page --solver '...' --timeout 45
```

Solve a task by hand (or with an interactive agent):

```bash
npm run bench -- setup technical-seo/crawl-audit --tag manual
# ... edit bench/runs/manual/technical-seo__crawl-audit/workspace ...
npm run bench -- grade technical-seo/crawl-audit --workspace bench/runs/manual/technical-seo__crawl-audit/workspace
```

Outputs land in `bench/runs/<tag>/`: per task `PROMPT.md`, `workspace/`, `solver.log`, `result.json`;
plus `summary.md` / `summary.json` with per-category means.

## Scoring

- Each check has a weight (default 1); **score = passed weight / total weight**.
- A task **passes** when score >= its threshold (default 80%) **and** every `required` check passes
  (build/lint/test gates are required - a change that breaks the build scores zero on the gate and fails the task).
- Checks marked `expectBaselinePass` are regression guards: they pass before any work is done and exist to
  catch collateral damage (e.g. "the Popular badge still exists", "the page is still not in the sitemap").

`validate` builds every task's workspace, grades it untouched, then applies the task's bundled reference
solution and grades again. It flags any check that passes "for free", any regression guard that is broken
at baseline, and any check the reference cannot satisfy - so graders stay honest as the site changes.

## Anatomy of a task

`bench/tasks/<category>/<name>.mjs` exports:

```js
export default {
  id, category, title, difficulty, timeBudgetMin,
  prompt: `...markdown given to the solver...`,
  setup: [ /* mutation ops applied before the baseline commit (optional) */ ],
  checks: [ /* declarative checks, see bench/lib/checks.mjs */ ],
  reference: [ /* mutation ops that solve the task; used only by `validate` */ ],
  passThreshold: 0.8, // optional
};
```

Mutation ops: `replace` (string or RegExp), `write`, `append`, `delete`, `copy` (with replacements), `fn`.
Check types: `exists`, `absent`, `contains`, `not_contains`, `each`, `none`, `sitemap`, `jsonld`, `command`, `fn`.
Shared site facts (tag IDs, slugs, page classification, build/lint gates) live in `bench/lib/site.mjs`.

To add a task: create the module, import it in `bench/tasks/index.mjs`, run `validate`.

## Notes

- Workspaces are built from the **working tree** (tracked + untracked files, minus `bench/`), so uncommitted
  site changes are included. The grader is never copied into a workspace, so a solver cannot read the checks.
- The harness has no dependencies beyond Node 18+ and git.
- `bench/runs/` is git-ignored.
