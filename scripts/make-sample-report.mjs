// Builds src/sample-report.json.
//
// The run is invented. No report from a customer or employer project is in this
// repository, the spec names are made up and the numbers come from a fixed seed,
// so the file only changes when this script changes. The report itself is
// assembled by src/report-factory.js, the same code the generator in the app
// uses.
//
// Usage: npm run sample

import { writeFileSync } from 'node:fs'
import { ERRORS, buildReport } from '../src/report-factory.js'

const BROWSERS = ['chromium', 'firefox', 'webkit']

// [title, line, ms, outcomes, error], where ms is the duration of a passing
// attempt in chromium and outcomes names the projects that do not just pass.
const UI_BLOCKS = [
  ['auth.spec.ts', 'sign in', [
    ['redirects to the dashboard after a valid login', 12, 1842],
    ['shows a validation error for an empty password', 24, 612],
    ['rejects a wrong password', 33, 1104],
    ['locks the account after five failed attempts', 45, 2100, { firefox: 'timedOut' }, ERRORS.locatorTimeout],
    ['keeps the redirect target after login', 61, 1932, { chromium: 'flaky', webkit: 'flaky' }, ERRORS.urlMismatch]
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
    ['applies a discount code', 54, 5361, 'failed', ERRORS.textMismatch],
    ['keeps the cart after a page reload', 70, 2915]
  ]],
  ['checkout.spec.ts', 'payment', [
    ['accepts a valid test card', 88, 4380],
    ['declines an expired card', 101, 3120],
    ['shows an error when the payment provider times out', 115, 3877, { firefox: 'flaky' }, ERRORS.responseTimeout],
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
    ['keeps the filter after a reload', 85, 1340, { webkit: 'failed' }, ERRORS.countMismatch]
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
    ['back button returns to the filtered list', 42, 1450, { webkit: 'flaky' }, ERRORS.emptyText],
    ['forward button restores the detail view', 55, 1320]
  ]]
]

const API_BLOCKS = [
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
    ['GET /orders/:id returns the order total', 92, 1208, 'failed', ERRORS.connectionRefused],
    ['PATCH /orders/:id cancels an open order', 104, 610],
    ['PATCH /orders/:id rejects a cancel for a shipped order', 115, 540],
    ['GET /orders lists the orders of a customer', 127, 720]
  ]]
]

function toBlocks(blocks, projects) {
  return blocks.map(([file, describe, specs]) => ({
    file,
    describe,
    projects,
    specs: specs.map(([title, line, ms, outcomes = null, error = null]) => ({ title, line, ms, outcomes, error }))
  }))
}

const report = buildReport({
  plan: [...toBlocks(UI_BLOCKS, BROWSERS), ...toBlocks(API_BLOCKS, ['api'])],
  retries: 2,
  workers: 6,
  seed: 20260514
})

const target = new URL('../src/sample-report.json', import.meta.url)
writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`)

const { expected, unexpected, flaky, skipped, duration } = report.stats
console.log(`wrote ${expected + unexpected + flaky + skipped} tests (${unexpected} failed, ${flaky} flaky, ${skipped} skipped), ${duration} ms`)
