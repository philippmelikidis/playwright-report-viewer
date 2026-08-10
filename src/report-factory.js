// Builds reports in the shape of the Playwright JSON reporter. The bundled
// sample and the generator in the app both go through here, so a report that the
// viewer can read is defined in one place.
//
// A plan is a list of blocks: { file, describe, projects, specs }, where a spec
// is { title, line, ms, outcomes, error }. ms is the duration of a passing
// attempt in chromium, outcomes is either one outcome for every project or a map
// from project name to outcome.

export const ERRORS = {
  locatorTimeout: {
    message:
      "Timed out 30000ms waiting for expect(locator).toBeVisible()\n\nLocator: getByTestId('account-locked-notice')\nExpected: visible\nReceived: hidden\n\nCall log:\n  - expect.toBeVisible with timeout 30000ms\n  - waiting for getByTestId('account-locked-notice')",
    stack: 'Error: Timed out 30000ms waiting for expect(locator).toBeVisible()\n    at tests/auth.spec.ts:74:52'
  },
  textMismatch: {
    message:
      'expect(locator).toHaveText(expected)\n\nLocator: getByTestId(\'cart-total\')\nExpected string: "Total: 49.90 EUR"\nReceived string: "Total: 59.90 EUR"\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - waiting for getByTestId(\'cart-total\')\n  - locator resolved to <span data-testid="cart-total">Total: 59.90 EUR</span>',
    stack: 'Error: expect(locator).toHaveText(expected)\n    at tests/checkout.spec.ts:96:41'
  },
  urlMismatch: {
    message:
      'Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n\nExpected pattern: /\\/orders\\/recent/\nReceived string: "http://127.0.0.1:3000/dashboard"',
    stack: 'Error: Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n    at tests/auth.spec.ts:52:24'
  },
  responseTimeout: {
    message:
      'page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n\nCall log:\n  - waiting for response "**/payment/authorize"',
    stack:
      'Error: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n    at tests/checkout.spec.ts:141:20'
  },
  countMismatch: {
    message:
      "expect(locator).toHaveCount(expected)\n\nLocator: getByTestId('product-card')\nExpected: 12\nReceived: 40\n\nCall log:\n  - expect.toHaveCount with timeout 5000ms\n  - waiting for getByTestId('product-card')",
    stack: 'Error: expect(locator).toHaveCount(expected)\n    at tests/catalog.spec.ts:97:44'
  },
  emptyText: {
    message:
      'expect(locator).toHaveText(expected)\n\nLocator: getByTestId(\'filter-summary\')\nExpected string: "Category: Shoes"\nReceived string: ""\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - locator resolved to <p data-testid="filter-summary"></p>',
    stack: 'Error: expect(locator).toHaveText(expected)\n    at tests/navigation.spec.ts:61:38'
  },
  connectionRefused: {
    message:
      'apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n\nCall log:\n  - → GET http://127.0.0.1:4010/orders/8842\n  - connect ECONNREFUSED 127.0.0.1:4010',
    stack: 'Error: apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n    at tests/api.spec.ts:118:30'
  }
}

// Slower engines get longer durations.
const PROJECT_FACTORS = { chromium: 1, firefox: 1.18, webkit: 1.34, api: 1 }

const TEST_STATUS = {
  passed: 'expected',
  failed: 'unexpected',
  timedOut: 'unexpected',
  flaky: 'flaky',
  skipped: 'skipped'
}

// Linear congruential generator: the same seed gives the same report, so a
// generated run can be reproduced from the settings alone.
export function createRandom(seed = 1) {
  let value = Math.abs(Math.trunc(Number(seed))) || 1

  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function outcomeFor(outcomes, project) {
  if (!outcomes) return 'passed'
  if (typeof outcomes === 'string') return outcomes
  return outcomes[project] || 'passed'
}

export function buildReport({
  plan,
  retries = 2,
  workers = 6,
  timeout = 30000,
  version = '1.49.1',
  rootDir = '/home/philipp/work/shop-e2e',
  startTime = '2026-05-14T08:41:12.318Z',
  seed = 1
}) {
  const random = createRandom(seed)
  const jitter = (spread) => Math.round((random() - 0.5) * 2 * spread)

  let clock = Date.parse(startTime)
  let worker = 0
  let specCounter = 0
  let attemptTime = 0
  const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }

  function durationsFor(outcome, ms, factor) {
    const base = Math.max(1, Math.round(ms * factor))

    if (outcome === 'skipped') return [0]
    // A failing test is retried until the retry budget is used up. A test that
    // runs into the test timeout spends the full timeout per attempt.
    if (outcome === 'timedOut') {
      return Array.from({ length: retries + 1 }, () => timeout + 120 + jitter(180))
    }
    if (outcome === 'failed') {
      return Array.from({ length: retries + 1 }, () => base + jitter(base * 0.02))
    }
    // The first attempt of a flaky test runs into a wait, the retry is normal.
    if (outcome === 'flaky') {
      return [Math.round(base * 2.6) + jitter(base * 0.05), base + jitter(base * 0.04)]
    }
    return [base + jitter(base * 0.06)]
  }

  function attemptStatus(outcome, index, count) {
    if (outcome === 'skipped') return 'skipped'
    if (outcome === 'timedOut') return 'timedOut'
    if (outcome === 'failed') return 'failed'
    if (outcome === 'flaky' && index < count - 1) return 'failed'
    return 'passed'
  }

  function makeTest(project, outcome, ms, error) {
    const durations = durationsFor(outcome, ms, PROJECT_FACTORS[project] ?? 1)
    stats[TEST_STATUS[outcome]] += 1
    worker = (worker + 1) % workers

    const results = durations.map((duration, retry) => {
      const status = attemptStatus(outcome, retry, durations.length)
      const errors = status === 'passed' || status === 'skipped' ? [] : [error ?? ERRORS.textMismatch]
      clock += 30 + Math.round(duration / 9)
      attemptTime += duration

      return {
        workerIndex: worker,
        parallelIndex: worker % workers,
        status,
        duration,
        errors,
        ...(errors.length ? { error: errors[0] } : {}),
        stdout: [],
        stderr: [],
        retry,
        startTime: new Date(clock).toISOString(),
        attachments: [],
        annotations: []
      }
    })

    return {
      timeout,
      annotations: outcome === 'skipped' ? [{ type: 'fixme', description: 'waiting for the mail sandbox' }] : [],
      expectedStatus: outcome === 'skipped' ? 'skipped' : 'passed',
      projectId: project,
      projectName: project,
      results,
      status: TEST_STATUS[outcome]
    }
  }

  function makeSpec(file, projects, spec) {
    specCounter += 1
    const tests = projects.map((project) =>
      makeTest(project, outcomeFor(spec.outcomes, project), spec.ms, spec.error)
    )

    return {
      title: spec.title,
      ok: tests.every((test) => test.status !== 'unexpected'),
      tags: [],
      tests,
      id: `${file.replace('.spec.ts', '')}-${specCounter}`,
      file,
      line: spec.line,
      column: 5
    }
  }

  const files = new Map()
  for (const block of plan) {
    if (!files.has(block.file)) {
      files.set(block.file, { title: block.file, file: block.file, column: 0, line: 0, specs: [], suites: [] })
    }

    files.get(block.file).suites.push({
      title: block.describe,
      file: block.file,
      line: Math.max(1, block.specs[0].line - 4),
      column: 3,
      specs: block.specs.map((spec) => makeSpec(block.file, block.projects, spec))
    })
  }

  const projectNames = [...new Set(plan.flatMap((block) => block.projects))]

  return {
    config: {
      rootDir,
      configFile: `${rootDir}/playwright.config.ts`,
      forbidOnly: false,
      fullyParallel: true,
      globalTimeout: 0,
      maxFailures: 0,
      reporter: [['list'], ['json', { outputFile: 'results.json' }]],
      retries,
      shard: null,
      workers,
      version,
      projects: projectNames.map((name) => ({
        outputDir: `${rootDir}/test-results`,
        repeatEach: 1,
        retries,
        id: name,
        name,
        testDir: `${rootDir}/tests/${name === 'api' ? 'api' : 'ui'}`,
        timeout
      }))
    },
    suites: [...files.values()],
    errors: [],
    stats: {
      startTime,
      // Wall clock of the run: the attempts spread over the workers, plus the
      // time the runner needs to start up and tear down.
      duration: Math.round(attemptTime / workers) + 4180,
      expected: stats.expected,
      skipped: stats.skipped,
      unexpected: stats.unexpected,
      flaky: stats.flaky
    }
  }
}

const FILE_POOL = [
  'auth.spec.ts',
  'checkout.spec.ts',
  'catalog.spec.ts',
  'account.spec.ts',
  'navigation.spec.ts',
  'search.spec.ts',
  'wishlist.spec.ts',
  'admin.spec.ts'
]

const DESCRIBE_POOL = ['sign in', 'session', 'cart', 'payment', 'product list', 'filters', 'profile', 'routing']

const TITLE_POOL = [
  'renders the empty state',
  'saves the form',
  'shows a validation error',
  'keeps the state after a reload',
  'opens the detail view',
  'removes the last item',
  'applies a discount code',
  'sends the confirmation mail',
  'loads the next page on scroll',
  'restores the previous view',
  'rejects an invalid input',
  'updates the quantity',
  'filters by category',
  'signs the user out',
  'handles a slow response',
  'shows the error banner on a failed request'
]

const ERROR_POOL = [
  ERRORS.locatorTimeout,
  ERRORS.textMismatch,
  ERRORS.urlMismatch,
  ERRORS.responseTimeout,
  ERRORS.countMismatch,
  ERRORS.emptyText
]

// Draws a plan out of the pools above. Used by the generator in the app, where
// the point is a report that looks plausible, not one specific run.
export function randomPlan({
  files = 4,
  specsPerFile = 6,
  projects = ['chromium'],
  failureRate = 0.08,
  flakeRate = 0.05,
  skipRate = 0.04,
  seed = 7
} = {}) {
  const random = createRandom(seed)
  const pick = (list) => list[Math.floor(random() * list.length) % list.length]
  const plan = []

  for (const file of FILE_POOL.slice(0, Math.min(files, FILE_POOL.length))) {
    const titles = [...TITLE_POOL]
    let line = 8

    // Two describe blocks per file unless the file is very small.
    const blocks = specsPerFile > 3 ? 2 : 1
    for (let block = 0; block < blocks; block += 1) {
      const count = block === 0 ? Math.ceil(specsPerFile / blocks) : Math.floor(specsPerFile / blocks)
      const specs = []

      for (let index = 0; index < count && titles.length; index += 1) {
        const title = titles.splice(Math.floor(random() * titles.length) % titles.length, 1)[0]
        const roll = random()
        let outcomes = null
        let error = null

        if (roll < failureRate) {
          outcomes = random() < 0.25 ? 'timedOut' : 'failed'
          error = pick(ERROR_POOL)
        } else if (roll < failureRate + flakeRate) {
          // A flake usually shows up in one engine only.
          outcomes = { [pick(projects)]: 'flaky' }
          error = pick(ERROR_POOL)
        } else if (roll > 1 - skipRate) {
          outcomes = 'skipped'
        }

        specs.push({
          title,
          line,
          ms: 400 + Math.round(random() * 4200),
          outcomes,
          error
        })
        line += 11
      }

      if (specs.length) {
        plan.push({ file, describe: pick(DESCRIBE_POOL), projects, specs })
      }
    }
  }

  return plan
}
