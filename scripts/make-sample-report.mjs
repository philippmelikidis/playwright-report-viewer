// Builds src/sample-report.json.
//
// The run is invented. No report from a customer or employer project is in this
// repository, the spec names are made up and the numbers come from a fixed
// seed, so the file only changes when this script changes. The shape follows
// the Playwright JSON reporter of version 1.49: suites nest, specs hold one
// test per project, tests hold one result per attempt.
//
// Usage: npm run sample

import { writeFileSync } from 'node:fs'

const TIMEOUT_ERROR = {
  message:
    "Timed out 30000ms waiting for expect(locator).toBeVisible()\n\nLocator: getByTestId('account-locked-notice')\nExpected: visible\nReceived: hidden\n\nCall log:\n  - expect.toBeVisible with timeout 30000ms\n  - waiting for getByTestId('account-locked-notice')",
  stack: 'Error: Timed out 30000ms waiting for expect(locator).toBeVisible()\n    at tests/auth.spec.ts:74:52'
}

const DISCOUNT_ERROR = {
  message:
    'expect(locator).toHaveText(expected)\n\nLocator: getByTestId(\'cart-total\')\nExpected string: "Total: 49.90 EUR"\nReceived string: "Total: 59.90 EUR"\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - waiting for getByTestId(\'cart-total\')\n  - locator resolved to <span data-testid="cart-total">Total: 59.90 EUR</span>',
  stack: 'Error: expect(locator).toHaveText(expected)\n    at tests/checkout.spec.ts:96:41'
}

const REDIRECT_ERROR = {
  message:
    'Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n\nExpected pattern: /\\/orders\\/recent/\nReceived string: "http://127.0.0.1:3000/dashboard"',
  stack: 'Error: Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n    at tests/auth.spec.ts:52:24'
}

const PROVIDER_ERROR = {
  message:
    'page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n\nCall log:\n  - waiting for response "**/payment/authorize"',
  stack:
    'Error: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n    at tests/checkout.spec.ts:141:20'
}

const FILTER_ERROR = {
  message:
    "expect(locator).toHaveCount(expected)\n\nLocator: getByTestId('product-card')\nExpected: 12\nReceived: 40\n\nCall log:\n  - expect.toHaveCount with timeout 5000ms\n  - waiting for getByTestId('product-card')",
  stack: 'Error: expect(locator).toHaveCount(expected)\n    at tests/catalog.spec.ts:97:44'
}

const HISTORY_ERROR = {
  message:
    'expect(locator).toHaveText(expected)\n\nLocator: getByTestId(\'filter-summary\')\nExpected string: "Category: Shoes"\nReceived string: ""\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - locator resolved to <p data-testid="filter-summary"></p>',
  stack: 'Error: expect(locator).toHaveText(expected)\n    at tests/navigation.spec.ts:61:38'
}

const ORDER_TOTAL_ERROR = {
  message:
    'apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n\nCall log:\n  - → GET http://127.0.0.1:4010/orders/8842\n  - connect ECONNREFUSED 127.0.0.1:4010',
  stack: 'Error: apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n    at tests/api.spec.ts:118:30'
}

// The browser projects run the same UI specs, the api project only talks to the
// service. Slower engines get longer durations through the factor.
const BROWSER_PROJECTS = [
  { name: 'chromium', factor: 1 },
  { name: 'firefox', factor: 1.18 },
  { name: 'webkit', factor: 1.34 }
]

// ms is the duration of a passing attempt in chromium, outcomes lists the
// projects where the spec does not simply pass.
const UI_SPECS = [
  ['auth.spec.ts', 'sign in', [
    ['redirects to the dashboard after a valid login', 12, 1842],
    ['shows a validation error for an empty password', 24, 612],
    ['rejects a wrong password', 33, 1104],
    ['locks the account after five failed attempts', 45, 2100, { firefox: 'timedOut' }, TIMEOUT_ERROR],
    ['keeps the redirect target after login', 61, 1932, { chromium: 'flaky', webkit: 'flaky' }, REDIRECT_ERROR]
  ]],
  ['auth.spec.ts', 'session', [
    ['persists the session across a reload', 80, 2260],
    ['logs out from the account menu', 91, 1490],
    ['sends the user back to login when the token expired', 103, 0, 'skipped']
  ]],
  ['checkout.spec.ts', 'cart', [
    ['adds a single item', 14, 1320],
    ['updates the quantity of a line item', 26, 1755],
    ['removes the last item and shows the empty state', 39, 1608],
    ['applies a discount code', 54, 5361, 'failed', DISCOUNT_ERROR],
    ['keeps the cart after a page reload', 70, 2915]
  ]],
  ['checkout.spec.ts', 'payment', [
    ['accepts a valid test card', 88, 4380],
    ['declines an expired card', 101, 3120],
    ['shows an error when the payment provider times out', 115, 3877, { firefox: 'flaky' }, PROVIDER_ERROR],
    ['sends the order confirmation mail', 132, 0, 'skipped'],
    ['runs the full checkout flow for a guest user', 146, 9840]
  ]],
  ['catalog.spec.ts', 'product list', [
    ['renders the first page of products', 11, 1420],
    ['shows the empty state when nothing matches', 22, 980],
    ['opens the product detail from a card', 31, 1660],
    ['lazy loads the next page on scroll', 44, 3240]
  ]],
  ['catalog.spec.ts', 'filters', [
    ['narrows the list by category', 60, 1180],
    ['combines category and price filter', 72, 1520],
    ['keeps the filter after a reload', 85, 1340, { webkit: 'failed' }, FILTER_ERROR]
  ]],
  ['account.spec.ts', 'profile', [
    ['saves a new display name', 10, 1265],
    ['rejects an invalid email', 20, 705],
    ['shows a hint when the password is too short', 29, 690]
  ]],
  ['account.spec.ts', 'addresses', [
    ['adds a delivery address', 44, 1880],
    ['deletes an address after confirmation', 58, 1610],
    ['exports the account data', 70, 0, 'skipped']
  ]],
  ['navigation.spec.ts', 'routing', [
    ['deep link to a product opens the detail view', 9, 1090],
    ['unknown route renders the not found view', 19, 640],
    ['keeps the query string when switching tabs', 28, 870]
  ]],
  ['navigation.spec.ts', 'history', [
    ['back button returns to the filtered list', 42, 1450, { webkit: 'flaky' }, HISTORY_ERROR],
    ['forward button restores the detail view', 55, 1320]
  ]]
]

const API_SPECS = [
  ['api.spec.ts', 'products', [
    ['GET /products returns the first page', 9, 380],
    ['GET /products supports paging', 18, 455],
    ['GET /products/:id returns 404 for an unknown id', 28, 240],
    ['GET /products filters by category', 36, 512],
    ['GET /products sorts by price', 45, 470],
    ['GET /products rejects an invalid page parameter', 54, 260]
  ]],
  ['api.spec.ts', 'orders', [
    ['POST /orders creates an order', 70, 690],
    ['POST /orders rejects an empty cart', 81, 305],
    ['GET /orders/:id returns the order total', 92, 1208, 'failed', ORDER_TOTAL_ERROR],
    ['PATCH /orders/:id cancels an open order', 104, 610],
    ['PATCH /orders/:id rejects a cancel for a shipped order', 115, 540],
    ['GET /orders lists the orders of a customer', 127, 720]
  ]]
]

const TEST_STATUS = {
  passed: 'expected',
  failed: 'unexpected',
  timedOut: 'unexpected',
  flaky: 'flaky',
  skipped: 'skipped'
}
const START_TIME = '2026-05-14T08:41:12.318Z'
const RETRIES = 2
const WORKERS = 6
const TEST_TIMEOUT = 30000

// Small linear congruential generator so the durations look uneven but stay the
// same on every run.
let seed = 20260514
function jitter(spread) {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return Math.round((seed / 2147483648 - 0.5) * 2 * spread)
}

let clock = Date.parse(START_TIME)
let worker = 0
let specCounter = 0
let attemptTime = 0
const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }

function outcomeFor(outcomes, project) {
  if (!outcomes) return 'passed'
  if (typeof outcomes === 'string') return outcomes
  return outcomes[project] || 'passed'
}

function durationsFor(outcome, ms, factor) {
  const base = Math.round(ms * factor)

  if (outcome === 'skipped') return [0]
  // A failing test is retried until the retry budget is used up. A test that
  // runs into the test timeout always spends the full timeout per attempt.
  if (outcome === 'timedOut') {
    return Array.from({ length: RETRIES + 1 }, () => TEST_TIMEOUT + 120 + jitter(180))
  }
  if (outcome === 'failed') {
    return Array.from({ length: RETRIES + 1 }, () => base + jitter(base * 0.02))
  }
  if (outcome === 'flaky') {
    // The first attempt runs into a timeout, the retry is a normal run.
    return [Math.round(base * 2.6) + jitter(base * 0.05), base + jitter(base * 0.04)]
  }
  return [base + jitter(base * 0.06)]
}

function attemptStatus(outcome, durations, index) {
  if (outcome === 'skipped') return 'skipped'
  if (outcome === 'timedOut') return 'timedOut'
  if (outcome === 'failed') return 'failed'
  if (outcome === 'flaky' && index < durations.length - 1) return 'failed'
  return 'passed'
}

function makeTest(project, outcome, ms, error) {
  const durations = durationsFor(outcome, ms, project.factor)
  stats[TEST_STATUS[outcome]] += 1
  worker = (worker + 1) % WORKERS

  const results = durations.map((duration, retry) => {
    const status = attemptStatus(outcome, durations, retry)
    const errors = status === 'passed' || status === 'skipped' ? [] : [error]
    clock += 30 + Math.round(duration / 9)
    attemptTime += duration

    return {
      workerIndex: worker,
      parallelIndex: worker % WORKERS,
      status,
      duration,
      errors,
      ...(errors.length ? { error } : {}),
      stdout: [],
      stderr: [],
      retry,
      startTime: new Date(clock).toISOString(),
      attachments: [],
      annotations: []
    }
  })

  return {
    timeout: TEST_TIMEOUT,
    annotations: outcome === 'skipped' ? [{ type: 'fixme', description: 'waiting for the mail sandbox' }] : [],
    expectedStatus: outcome === 'skipped' ? 'skipped' : 'passed',
    projectId: project.name,
    projectName: project.name,
    results,
    status: TEST_STATUS[outcome]
  }
}

function makeSpec(file, projects, [title, line, ms, outcomes, error]) {
  specCounter += 1
  const tests = projects.map((project) => makeTest(project, outcomeFor(outcomes, project.name), ms, error))

  return {
    title,
    ok: tests.every((test) => test.status !== 'unexpected'),
    tags: [],
    tests,
    id: `${file.replace('.spec.ts', '')}-${specCounter}`,
    file,
    line,
    column: 5
  }
}

const files = new Map()
function addBlock([file, describe, specs], projects) {
  if (!files.has(file)) {
    files.set(file, { title: file, file, column: 0, line: 0, specs: [], suites: [] })
  }

  files.get(file).suites.push({
    title: describe,
    file,
    line: specs[0][1] - 4,
    column: 3,
    specs: specs.map((spec) => makeSpec(file, projects, spec))
  })
}

for (const block of UI_SPECS) addBlock(block, BROWSER_PROJECTS)
for (const block of API_SPECS) addBlock(block, [{ name: 'api', factor: 1 }])

function projectConfig(name, testDir) {
  return {
    outputDir: '/home/philipp/work/shop-e2e/test-results',
    repeatEach: 1,
    retries: RETRIES,
    id: name,
    name,
    testDir: `/home/philipp/work/shop-e2e/${testDir}`,
    timeout: TEST_TIMEOUT
  }
}

const report = {
  config: {
    rootDir: '/home/philipp/work/shop-e2e',
    configFile: '/home/philipp/work/shop-e2e/playwright.config.ts',
    forbidOnly: false,
    fullyParallel: true,
    globalTimeout: 0,
    maxFailures: 0,
    reporter: [['list'], ['json', { outputFile: 'results.json' }]],
    retries: RETRIES,
    shard: null,
    workers: WORKERS,
    version: '1.49.1',
    projects: [
      projectConfig('chromium', 'tests/ui'),
      projectConfig('firefox', 'tests/ui'),
      projectConfig('webkit', 'tests/ui'),
      projectConfig('api', 'tests/api')
    ]
  },
  suites: [...files.values()],
  errors: [],
  stats: {
    startTime: START_TIME,
    // Wall clock of the run: the attempts spread over the workers, plus the
    // time the runner needs to start up and tear down.
    duration: Math.round(attemptTime / WORKERS) + 4180,
    expected: stats.expected,
    skipped: stats.skipped,
    unexpected: stats.unexpected,
    flaky: stats.flaky
  }
}

const target = new URL('../src/sample-report.json', import.meta.url)
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`)

const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped
console.log(`wrote ${specCounter} specs, ${total} tests, ${report.stats.duration} ms`)
