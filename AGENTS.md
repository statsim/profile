# Project briefing for awesome agents

You are the most talented and experienced agent in the world, and you have been tasked with leading the development of StatSim Preview, a powerful data analysis tool that can process large datasets and provide insights in real-time.

## Philosophy

StatSim Preview is a **data analysis** tool focused on providing real-time insights from large datasets, while maintaining simplicity and clarity in its design. The main distinction between StatSim Preview and other data analysis tools is its emphasis on **streaming processing**, browser-based execution, and a minimalist approach to features and UI. StatSim Preview is designed to be a lightweight, efficient, and user-friendly tool that can handle large datasets without overwhelming users with unnecessary complexity.

Every line of code, every feature, and every design choice in StatSim Preview must serve a clear purpose and contribute to the overall goal of providing real-time insights from large datasets.

## Style

Use **2-space indentation** and **semicolon-free** syntax. Use **single quotes** for strings. Preserve the existing style in the codebase, and avoid introducing new formatting styles or conventions.

## Quick start
- Install: `npm install`
- Tests: `npm test` (runs unit tests + Playwright E2E)
- Lint/format: Not configured; use `npm run build-dev` as a fast sanity build
- CLI: `node src/cli/index.js data.csv` (outputs JSON profiling result)

## Repo map
- `src/core/`: pure-JS profiling engine (no DOM deps)
  - `index.js`: `profileStream(readable, opts)` — main API
  - `constants.js`: shared constants (missing markers, thresholds, stats conventions)
  - `classify.js`: `classifyValue()`, `getVariableType()` — pure functions
  - `columns.js`: `initColumns()`, `updateColumns()` — online-stats wrappers
  - `result.js`: `finalizeResult()` — builds versioned ProfileResult (v1)
- `src/render/index.js`: DOM/chart rendering (tui-chart), consumes ProfileResult
- `src/worker/profile-worker.js`: Web Worker — runs core in background thread
- `src/main.js`: browser entry — DnD/input handlers, Worker dispatch, render
- `src/cli/index.js`: CLI entry — `fs.createReadStream` → core → JSON output
- `index.html`: UI shell and app entrypoint
- `css/`: app styles and vendor chart CSS
- `dist/bundle.js`: built browser bundle (generated)
- `dist/worker-bundle.js`: built worker bundle (generated)
- `fonts/`: local Roboto font assets
- `tests/unit/`: tape unit tests for core modules
- `tests/e2e/`: Playwright browser-level regression tests
- `tests/support/`: local static server used by E2E tests

## Definition of done
- Run: `npm run build` (or `npm run build-dev` during iteration)
- Add/adjust unit tests for core logic (classify, columns, result) in `tests/unit/`
- Add/adjust E2E tests for browser upload flow in `tests/e2e/`
- If you can't run tests: explain + add a minimal verification note

## Constraints
- Don’t add new production dependencies without asking.
- No DB migrations exist in this repo; ask before introducing any persistence layer or migration tooling.
- Update the `README.md`, `CHANGELOG.md` and `index.html` with any user-facing changes or new features.
- Commit messages should be clear and descriptive, following the format: `feature|fix|test|docs: short description` (e.g., `feature: add new column type classification`).

## Conventions
- Formatting: no formatter is configured; preserve existing style (2-space indentation, semicolon-free, single quotes)
- Types: plain JavaScript with runtime type checks (`typeof`, `isNaN`) and counters
- Error handling: prefer tolerant stream processing (skip malformed lines, classify invalid/empty values as `missing`, degrade expensive stats for unsuitable columns instead of hard-failing)
