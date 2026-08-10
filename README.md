# Playwright Report Viewer

I wanted a way to read the `results.json` of the Playwright JSON reporter in a few seconds, without spinning up the full HTML report just to find out which tests failed and which ones got slow.

## Quickstart

```
npm install
npm run dev
```

The sample report is loaded on startup, so the app shows something right away. Use "Open results.json" or drop a file anywhere on the window to look at your own run. The file is parsed in the browser, nothing is uploaded anywhere.

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
- Grouping by spec file with test count, failures and total duration per file
- The error message of a failing test, expandable per row, with the spec file and line
- A comparison against a baseline report: broke, fixed, still failing, now flaky, new
- The current filter, search, sort and grouping in the url, so a view can be sent as a link
- The run context from the config block: Playwright version, workers, retries, shard and projects

A test counts as flaky when the last attempt passed and at least one earlier attempt failed. Durations are the sum of all attempts, so a test that timed out twice before passing looks expensive, which is the point.

## Comparing two runs

The question after a run is rarely how many tests failed, it is which ones changed. Load an older `results.json` as baseline and the table gets a change column: broke, fixed, still failing, now flaky, new, plus the duration difference per test. "Changed only" reduces the table to those tests.

Tests are matched by project, suite path and title, because the spec id in the report changes as soon as the file is edited. Tests that exist in the baseline but not in the current run have no row here, so they are only counted in the bar.

## Generate a report

Sometimes I want to look at the viewer without a run at hand, or I need a fixture for something else. The Generate panel builds a report from a seed, a number of spec files, specs per file, browser projects and a failure and flake rate, loads it and offers it as a `results.json` download. The same seed gives the same report.

The panel and the sample script go through `src/report-factory.js`, so there is one definition of what a report looks like.

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
src/components/RunContext.vue   version, workers, retries and projects of the run
src/view-state.js               reads and writes the table state in the query string
src/compare.js                  matches two runs and labels the status changes
src/components/BaselineBar.vue  baseline file and the change counts
src/sample-report.json          generated sample run, see Sample data
src/report-factory.js           builds reports in the shape of the json reporter
src/components/MockReportPanel.vue settings for a generated run
scripts/make-sample-report.mjs  writes the sample report
```

## Ideas for later

- Keep a few runs in local storage and show a duration and failure trend per test, the comparison only knows two runs
- Show the attachments of a failing test, at least the trace and screenshot names
- Read the blob reporter output so a sharded run can be looked at without merging it first

Philippos Melikidis, [github.com/philippmelikidis](https://github.com/philippmelikidis)
