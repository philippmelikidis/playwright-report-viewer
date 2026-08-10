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

The unit tests cover the parts where a wrong report turns into wrong numbers: the normalizer (nested suites, retries, flaky detection, unknown statuses, missing fields, broken input), the comparison, the view state in the url and the report factory.

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
src/composables/useReport.js        loads a report, flattens the nested suites, derives the status
src/compare.js                      matches two runs and labels the status changes
src/view-state.js                   reads and writes the table state in the query string
src/report-factory.js               builds reports in the shape of the json reporter
src/format.js                       durations for humans
src/components/
  ReportSource.vue                  file input, sample loader, generator toggle
  RunContext.vue                    version, workers, retries and projects of the run
  SummaryCards.vue                  the counts and the run duration
  SlowestTests.vue                  inline svg bars, no chart library
  BaselineBar.vue                   baseline file and the change counts
  MockReportPanel.vue               settings for a generated run
  TestTable.vue                     filter, search, sort, grouping, expandable errors
src/sample-report.json              generated sample run, see Sample data
scripts/make-sample-report.mjs      writes the sample report
tests/                              vitest, no browser needed
```

## Ideas for later

- Keep a few runs in local storage and show a duration and failure trend per test, the comparison only knows two runs
- Show the attachments of a failing test, at least the trace and screenshot names
- Read the blob reporter output so a sharded run can be looked at without merging it first

Philippos Melikidis, [github.com/philippmelikidis](https://github.com/philippmelikidis)
