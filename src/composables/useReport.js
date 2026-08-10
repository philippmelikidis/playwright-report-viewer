import { computed, ref } from 'vue'
import sampleReport from '../sample-report.json'

// Playwright writes the per-test verdict as expected/unexpected/flaky/skipped.
// Used as a fallback when the result entries are missing or carry a status we
// do not know about.
const TEST_STATUS_MAP = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped'
}

const RESULT_STATUS_MAP = {
  passed: 'passed',
  failed: 'failed',
  timedOut: 'failed',
  interrupted: 'failed',
  skipped: 'skipped'
}

function isFailedAttempt(result) {
  return RESULT_STATUS_MAP[result.status] === 'failed'
}

// Terminal colour codes end up in the JSON report, they are noise here.
function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return String(text).replace(/\u001b\[[0-9;]*m/g, '')
}

function firstError(results) {
  for (const result of results) {
    const error = result.error || (Array.isArray(result.errors) ? result.errors[0] : null)
    if (error && (error.message || error.value)) {
      return stripAnsi(error.message || error.value).trim()
    }
  }
  return ''
}

// A test counts as flaky when the final attempt passed but an earlier attempt
// did not. Playwright also sets status "flaky" itself, we accept both.
function resolveStatus(test, results) {
  if (results.length === 0) {
    return TEST_STATUS_MAP[test.status] || 'unknown'
  }

  const last = results[results.length - 1]
  const earlierFailed = results.slice(0, -1).some(isFailedAttempt)

  if (last.status === 'passed' && earlierFailed) return 'flaky'
  if (test.status === 'flaky') return 'flaky'

  return RESULT_STATUS_MAP[last.status] || TEST_STATUS_MAP[test.status] || 'unknown'
}

function normalizeTest(spec, test, suitePath, index) {
  const results = Array.isArray(test.results) ? test.results : []
  const duration = results.reduce((total, result) => total + (Number(result.duration) || 0), 0)

  return {
    id: test.id || `${spec.id || spec.title}-${test.projectName || 'default'}-${index}`,
    title: spec.title || '(untitled test)',
    suite: suitePath.join(' > '),
    file: spec.file || suitePath[0] || '',
    line: spec.line || 0,
    project: test.projectName || '',
    status: resolveStatus(test, results),
    duration,
    attempts: results.length,
    error: firstError(results)
  }
}

// Suites nest arbitrarily deep (file suite, then one level per describe block),
// so the titles are collected on the way down and used as the suite path.
function collectTests(suites, parentPath, target) {
  for (const suite of suites || []) {
    const path = suite.title ? [...parentPath, suite.title] : [...parentPath]

    for (const spec of suite.specs || []) {
      const tests = Array.isArray(spec.tests) ? spec.tests : []
      tests.forEach((test, index) => {
        target.push(normalizeTest(spec, test, path, index))
      })
    }

    collectTests(suite.suites, path, target)
  }

  return target
}

export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.suites)) {
    throw new Error('This file does not look like a Playwright JSON report, no "suites" array found.')
  }

  const tests = collectTests(raw.suites, [], [])
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {}
  const reportedDuration = Number(stats.duration)

  return {
    tests,
    startedAt: typeof stats.startTime === 'string' ? stats.startTime : '',
    // Wall clock time from the runner is more honest than the sum of test
    // durations, which counts parallel workers twice.
    duration: Number.isFinite(reportedDuration) && reportedDuration > 0
      ? reportedDuration
      : tests.reduce((total, test) => total + test.duration, 0)
  }
}

export function useReport() {
  const tests = ref([])
  const source = ref('')
  const startedAt = ref('')
  const duration = ref(0)
  const error = ref('')

  function apply(raw, label) {
    const report = normalizeReport(raw)
    tests.value = report.tests
    startedAt.value = report.startedAt
    duration.value = report.duration
    source.value = label
    error.value = ''
  }

  function loadSample() {
    try {
      apply(sampleReport, 'sample-report.json')
    } catch (err) {
      error.value = err.message
    }
  }

  async function loadFile(file) {
    if (!file) return

    try {
      apply(JSON.parse(await file.text()), file.name)
    } catch (err) {
      error.value = err instanceof SyntaxError
        ? `${file.name} is not valid JSON: ${err.message}`
        : err.message
    }
  }

  const summary = computed(() => {
    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, unknown: 0 }
    for (const test of tests.value) {
      counts[test.status] = (counts[test.status] || 0) + 1
    }
    return { ...counts, duration: duration.value }
  })

  return { tests, summary, source, startedAt, error, loadSample, loadFile }
}
