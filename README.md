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

Lint and unit tests:

```
npm run lint
npm test
```

The tests cover the normalizer, which is where a wrong report is turned into wrong numbers: nested suites, retries, flaky detection, unknown statuses and missing fields.

## What it shows

- Counts for passed, failed, flaky and skipped plus the wall clock duration of the run
- A test table with status filter, project filter, text search over suite and test name, and sorting by duration
- The ten slowest tests as horizontal bars
- The error message of a failing test, expandable per row

A test counts as flaky when the last attempt passed and at least one earlier attempt failed. Durations are the sum of all attempts, so a test that timed out twice before passing looks expensive, which is the point.

## Sample data

The sample run is invented. It is built by `scripts/make-sample-report.mjs`, which writes `src/sample-report.json` from a fixed seed, so the file only changes when the script changes:

```
npm run sample
```

It covers what my runs usually look like: five UI spec files on chromium, firefox and webkit plus an api spec file in its own project, 120 tests in total, with six failures, four flaky tests and a spec that only breaks in webkit. No report from a customer or employer project is in this repository, and the app marks the sample as synthetic while it is loaded.

## Structure

```
src/composables/useReport.js   flattens the nested suites into one test list and derives the status
src/components/SummaryCards.vue
src/components/SlowestTests.vue inline SVG bars, no chart library
src/components/TestTable.vue    filter, search, sort, expandable errors
src/components/ReportSource.vue file input and sample loader
src/sample-report.json          generated sample run, see Sample data
scripts/make-sample-report.mjs  writes the sample report
```

## Ideas for later

- Keep a few runs in local storage and show a duration and failure trend per test
- Compare two reports and list the tests that changed status
- Group the table by spec file with a per file duration, which is usually where the slow setup hides

Philippos Melikidis, [github.com/philippmelikidis](https://github.com/philippmelikidis)
