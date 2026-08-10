# Playwright Report Viewer

I wanted a way to read the `results.json` of the Playwright JSON reporter in a few seconds, without spinning up the full HTML report just to find out which tests failed and which ones got slow.

## Quickstart

```
npm install
npm run dev
```

The sample report is loaded on startup, so the app shows something right away. Use "Open results.json" to look at your own run. The file is parsed in the browser, nothing is uploaded anywhere.

To get a JSON report out of Playwright:

```
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json
```

## What it shows

- Counts for passed, failed, flaky and skipped plus the wall clock duration of the run
- A test table with status filter, text search over suite and test name, and sorting by duration
- The ten slowest tests as horizontal bars
- The error message of a failing test, expandable per row

A test counts as flaky when the last attempt passed and at least one earlier attempt failed. Durations are the sum of all attempts, so a test that timed out twice before passing looks expensive, which is the point.

## Structure

```
src/composables/useReport.js   flattens the nested suites into one test list and derives the status
src/components/SummaryCards.vue
src/components/SlowestTests.vue inline SVG bars, no chart library
src/components/TestTable.vue    filter, search, sort, expandable errors
src/components/ReportSource.vue file input and sample loader
src/sample-report.json          25 tests over three spec files, taken from a run of a shop test suite
```

## Ideas for later

- Keep a few runs in local storage and show a duration and failure trend per test
- Compare two reports and list the tests that changed status
- Group the table by spec file with a per file duration, which is usually where the slow setup hides

Philippos Melikidis, [github.com/philippmelikidis](https://github.com/philippmelikidis)
