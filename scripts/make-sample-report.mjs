// Builds src/sample-report.json.
//
// The run is invented. No customer or employer data is in this repository, the
// spec names are made up and the numbers are fixed, so the file only changes
// when this script changes. The shape follows the Playwright JSON reporter of
// version 1.49: suites nest, specs hold tests, tests hold one result per
// attempt.
//
// Usage: npm run sample

import { writeFileSync } from 'node:fs'

const TIMEOUT_ERROR = {
  message:
    "Timed out 30000ms waiting for expect(locator).toBeVisible()\n\nLocator: getByTestId('account-locked-notice')\nExpected: visible\nReceived: hidden\n\nCall log:\n  - expect.toBeVisible with timeout 30000ms\n  - waiting for getByTestId('account-locked-notice')",
  stack:
    'Error: Timed out 30000ms waiting for expect(locator).toBeVisible()\n    at /home/philipp/work/shop-e2e/tests/auth.spec.ts:74:52'
}

const ASSERTION_ERROR = {
  message:
    'expect(locator).toHaveText(expected)\n\nLocator: getByTestId(\'cart-total\')\nExpected string: "Total: 49.90 EUR"\nReceived string: "Total: 59.90 EUR"\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - waiting for getByTestId(\'cart-total\')\n  - locator resolved to <span data-testid="cart-total">Total: 59.90 EUR</span>',
  stack:
    'Error: expect(locator).toHaveText(expected)\n    at /home/philipp/work/shop-e2e/tests/checkout.spec.ts:96:41'
}

const NETWORK_ERROR = {
  message:
    'apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n\nCall log:\n  - → GET http://127.0.0.1:4010/orders/8842\n  - connect ECONNREFUSED 127.0.0.1:4010',
  stack:
    'Error: apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:4010\n    at /home/philipp/work/shop-e2e/tests/api.spec.ts:118:30'
}

const URL_ERROR = {
  message:
    'Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n\nExpected pattern: /\\/reports\\/weekly/\nReceived string: "http://127.0.0.1:3000/dashboard"',
  stack:
    'Error: Timed out 5000ms waiting for expect(page).toHaveURL(expected)\n    at /home/philipp/work/shop-e2e/tests/auth.spec.ts:52:24'
}

const PROVIDER_ERROR = {
  message:
    'page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n\nCall log:\n  - waiting for response "**/payment/authorize"',
  stack:
    'Error: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"\n    at /home/philipp/work/shop-e2e/tests/checkout.spec.ts:141:20'
}

// file, describe block, then one entry per spec:
// [title, line, outcome, duration of every attempt, error of the failing attempts]
const PLAN = [
  ['auth.spec.ts', 'sign in', [
    ['redirects to the dashboard after a valid login', 12, 'passed', [1842]],
    ['shows a validation error for an empty password', 24, 'passed', [612]],
    ['rejects a wrong password', 33, 'passed', [1104]],
    ['locks the account after five failed attempts', 45, 'failed', [30412, 30288, 30355], TIMEOUT_ERROR],
    ['keeps the redirect target after login', 61, 'flaky', [5218, 1932], URL_ERROR]
  ]],
  ['auth.spec.ts', 'session', [
    ['persists the session across a reload', 80, 'passed', [2260]],
    ['logs out from the account menu', 91, 'passed', [1490]],
    ['sends the user back to login when the token expired', 103, 'skipped', [0]]
  ]],
  ['checkout.spec.ts', 'cart', [
    ['adds a single item', 14, 'passed', [1320]],
    ['updates the quantity of a line item', 26, 'passed', [1755]],
    ['removes the last item and shows the empty state', 39, 'passed', [1608]],
    ['applies a discount code', 54, 'failed', [5361, 5297, 5344], ASSERTION_ERROR],
    ['keeps the cart after a page reload', 70, 'passed', [2915]]
  ]],
  ['checkout.spec.ts', 'payment', [
    ['accepts a valid test card', 88, 'passed', [4380]],
    ['declines an expired card', 101, 'passed', [3120]],
    ['shows an error when the payment provider times out', 115, 'flaky', [10344, 3877], PROVIDER_ERROR],
    ['sends the order confirmation mail', 132, 'skipped', [0]],
    ['runs the full checkout flow for a guest user', 146, 'passed', [9840]]
  ]],
  ['api.spec.ts', 'products', [
    ['GET /products returns the first page', 9, 'passed', [380]],
    ['GET /products supports paging', 18, 'passed', [455]],
    ['GET /products/:id returns 404 for an unknown id', 28, 'passed', [240]],
    ['GET /products filters by category', 36, 'passed', [512]]
  ]],
  ['api.spec.ts', 'orders', [
    ['POST /orders creates an order', 52, 'passed', [690]],
    ['POST /orders rejects an empty cart', 63, 'passed', [305]],
    ['GET /orders/:id returns the order total', 74, 'failed', [1208, 1174, 1191], NETWORK_ERROR]
  ]]
]

const TEST_STATUS = { passed: 'expected', failed: 'unexpected', flaky: 'flaky', skipped: 'skipped' }
const START_TIME = '2026-05-14T08:41:12.318Z'

let clock = Date.parse(START_TIME)
let worker = 0
let specCounter = 0
const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }

function attemptStatus(outcome, durations, index) {
  if (outcome === 'skipped') return 'skipped'
  if (outcome === 'failed') return durations[index] > 30000 ? 'timedOut' : 'failed'
  if (outcome === 'flaky' && index < durations.length - 1) return 'failed'
  return 'passed'
}

function makeResults(outcome, durations, error) {
  return durations.map((duration, retry) => {
    const status = attemptStatus(outcome, durations, retry)
    const errors = status === 'passed' || status === 'skipped' ? [] : [error]
    clock += 40 + Math.round(duration / 7)

    return {
      workerIndex: worker,
      parallelIndex: worker % 4,
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
}

function makeSpec(file, title, line, outcome, durations, error) {
  specCounter += 1
  worker = (worker + 1) % 4
  stats[TEST_STATUS[outcome]] += 1

  return {
    title,
    ok: outcome !== 'failed',
    tags: [],
    tests: [
      {
        timeout: 30000,
        annotations: outcome === 'skipped' ? [{ type: 'skip', description: 'pending mail sandbox' }] : [],
        expectedStatus: outcome === 'skipped' ? 'skipped' : 'passed',
        projectId: 'chromium',
        projectName: 'chromium',
        results: makeResults(outcome, durations, error),
        status: TEST_STATUS[outcome]
      }
    ],
    id: `${file.replace('.spec.ts', '')}-${specCounter}`,
    file,
    line,
    column: 5
  }
}

const files = new Map()
for (const [file, describe, specs] of PLAN) {
  if (!files.has(file)) {
    files.set(file, { title: file, file, column: 0, line: 0, specs: [], suites: [] })
  }

  files.get(file).suites.push({
    title: describe,
    file,
    line: specs[0][1] - 4,
    column: 3,
    specs: specs.map(([title, line, outcome, durations, error]) =>
      makeSpec(file, title, line, outcome, durations, error)
    )
  })
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
    retries: 2,
    workers: 4,
    version: '1.49.1',
    projects: [
      {
        outputDir: '/home/philipp/work/shop-e2e/test-results',
        repeatEach: 1,
        retries: 2,
        id: 'chromium',
        name: 'chromium',
        testDir: '/home/philipp/work/shop-e2e/tests',
        timeout: 30000
      }
    ]
  },
  suites: [...files.values()],
  errors: [],
  stats: {
    startTime: START_TIME,
    duration: 64118,
    expected: stats.expected,
    skipped: stats.skipped,
    unexpected: stats.unexpected,
    flaky: stats.flaky
  }
}

const target = new URL('../src/sample-report.json', import.meta.url)
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`)
console.log(`wrote ${specCounter} specs to ${target.pathname}`)
