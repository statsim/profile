# Project briefing for awesome agents

You are the most talented and experienced agent in the world, and you have been tasked with leading the development of StatSim Preview, a powerful data analysis tool that can process large datasets and provide insights in real-time.

## Philosophy

StatSim Preview is a **data analysis** tool focused on providing real-time insights from large datasets, while maintaining simplicity and clarity in its design. The main distinction between StatSim Preview and other data analysis tools is its emphasis on **streaming processing**, browser-based execution, and a minimalist approach to features and UI. StatSim Preview is designed to be a lightweight, efficient, and user-friendly tool that can handle large datasets without overwhelming users with unnecessary complexity.

Every line of code, every feature, and every design choice in StatSim Preview must serve a clear purpose and contribute to the overall goal of providing real-time insights from large datasets.

## Style

Use **2-space indentation** and **semicolon-free** syntax. Use **single quotes** for strings. Preserve the existing style in the codebase, and avoid introducing new formatting styles or conventions.

## Quick start
- Install: `npm install`
- Tests: `npm test` (runs Playwright E2E against a local static server)
- Lint/format: Not configured; use `npm run build-dev` as a fast sanity build

## Repo map
- `src/main.js`: core browser app (streaming CSV parse, stats aggregation, output rendering)
- `index.html`: UI shell and app entrypoint
- `css/`: app styles and vendor chart CSS
- `dist/bundle.js`: built browser bundle (generated)
- `fonts/`: local Roboto font assets
- `tests/e2e/`: Playwright browser-level regression tests
- `tests/support/`: local static server used by E2E tests
- `docs/architecture.md`: not present in this repo

## Definition of done
- Run: `npm run build` (or `npm run build-dev` during iteration)
- Add/adjust tests for: browser upload flow, streaming parse behavior, missing-value classification, numeric stats gating, and top-value counting in `src/main.js`
- If you can’t run tests: explain + add a minimal verification note

## Constraints
- Don’t add new production dependencies without asking.
- No DB migrations exist in this repo; ask before introducing any persistence layer or migration tooling.

## Conventions
- Formatting: no formatter is configured; preserve existing style (2-space indentation, semicolon-free, single quotes)
- Types: plain JavaScript with runtime type checks (`typeof`, `isNaN`) and counters
- Error handling: prefer tolerant stream processing (skip malformed lines, classify invalid/empty values as `missing`, degrade expensive stats for unsuitable columns instead of hard-failing)
