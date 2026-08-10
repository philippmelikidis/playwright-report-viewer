import { describe, expect, it } from 'vitest'
import { normalizeReport } from '../src/composables/useReport.js'
import sampleReport from '../src/sample-report.json'
import { formatDuration } from '../src/format.js'

const ESC = String.fromCharCode(27)

function report(suites, stats) {
  return { suites, stats }
}

function spec(title, tests, file = 'demo.spec.ts', line = 7) {
  return { title, file, line, id: `${file}-${title}`, tests }
}

function test(results, status = 'expected', projectName = 'chromium') {
  return { projectName, status, results }
}

function attempt(status, duration, error) {
  return { status, duration, retry: 0, ...(error ? { error: { message: error } } : {}) }
}

describe('normalizeReport', () => {
  it('walks nested suites and keeps the suite path', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'checkout.spec.ts',
          suites: [
            {
              title: 'cart',
              suites: [{ title: 'discounts', specs: [spec('applies a code', [test([attempt('passed', 100)])])] }]
            }
          ]
        }
      ])
    )

    expect(tests).toHaveLength(1)
    expect(tests[0].suite).toBe('checkout.spec.ts > cart > discounts')
  })

  it('sums the duration of all attempts', () => {
    const { tests } = normalizeReport(
      report([
        { title: 'a.spec.ts', specs: [spec('retried test', [test([attempt('failed', 900, 'nope'), attempt('passed', 350)])])] }
      ])
    )

    expect(tests[0].duration).toBe(1250)
    expect(tests[0].attempts).toBe(2)
  })

  it('reports flaky when the last attempt passed after a failure', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'a.spec.ts',
          specs: [
            spec('flaky one', [test([attempt('failed', 500, 'first try'), attempt('passed', 200)], 'flaky')]),
            spec('flaky after timeout', [test([attempt('timedOut', 30000, 'timeout'), attempt('passed', 400)])])
          ]
        }
      ])
    )

    expect(tests.map((entry) => entry.status)).toEqual(['flaky', 'flaky'])
  })

  it('does not call a test flaky when only the last attempt failed', () => {
    const { tests } = normalizeReport(
      report([
        { title: 'a.spec.ts', specs: [spec('failing', [test([attempt('failed', 800, 'boom')], 'unexpected')])] }
      ])
    )

    expect(tests[0].status).toBe('failed')
  })

  it('maps timedOut and interrupted attempts to failed', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'a.spec.ts',
          specs: [
            spec('timeout', [test([attempt('timedOut', 30000, 'timeout')], 'unexpected')]),
            spec('interrupted', [test([attempt('interrupted', 120)], 'unexpected')])
          ]
        }
      ])
    )

    expect(tests.map((entry) => entry.status)).toEqual(['failed', 'failed'])
  })

  it('keeps skipped tests', () => {
    const { tests } = normalizeReport(
      report([{ title: 'a.spec.ts', specs: [spec('pending', [test([attempt('skipped', 0)], 'skipped')])] }])
    )

    expect(tests[0].status).toBe('skipped')
    expect(tests[0].duration).toBe(0)
  })

  it('falls back to the test status when there are no results', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'a.spec.ts',
          specs: [
            spec('never ran', [test(undefined, 'skipped')]),
            spec('no verdict', [{ projectName: 'chromium', results: [] }])
          ]
        }
      ])
    )

    expect(tests.map((entry) => entry.status)).toEqual(['skipped', 'unknown'])
    expect(tests[0].attempts).toBe(0)
  })

  it('marks a status it does not know as unknown', () => {
    const { tests } = normalizeReport(
      report([{ title: 'a.spec.ts', specs: [spec('odd', [test([attempt('surprise', 10)], 'weird')])] }])
    )

    expect(tests[0].status).toBe('unknown')
  })

  it('survives empty suites and missing fields', () => {
    const { tests } = normalizeReport(
      report([
        { title: 'empty.spec.ts' },
        { title: 'no-specs.spec.ts', specs: [] },
        { specs: [{ tests: [{ results: [attempt('passed', 5)] }] }] }
      ])
    )

    expect(tests).toHaveLength(1)
    expect(tests[0].title).toBe('(untitled test)')
    expect(tests[0].project).toBe('')
  })

  it('takes the error of the first failing attempt and drops colour codes', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'a.spec.ts',
          specs: [spec('coloured', [test([attempt('failed', 12, `${ESC}[31mExpected:${ESC}[39m 2`), attempt('passed', 8)])])]
        }
      ])
    )

    expect(tests[0].error).toBe('Expected: 2')
  })

  it('reads the errors array when there is no single error field', () => {
    const { tests } = normalizeReport(
      report([
        {
          title: 'a.spec.ts',
          specs: [
            spec('array errors', [
              test([{ status: 'failed', duration: 20, errors: [{ message: 'from the errors array' }] }], 'unexpected')
            ])
          ]
        }
      ])
    )

    expect(tests[0].error).toBe('from the errors array')
  })

  it('prefers the run duration from stats and falls back to the sum', () => {
    const suites = [{ title: 'a.spec.ts', specs: [spec('one', [test([attempt('passed', 400)])])] }]

    expect(normalizeReport(report(suites, { duration: 9000 })).duration).toBe(9000)
    expect(normalizeReport(report(suites)).duration).toBe(400)
  })

  it('rejects anything that is not a Playwright report', () => {
    expect(() => normalizeReport(null)).toThrow(/does not look like/)
    expect(() => normalizeReport({ tests: [] })).toThrow(/suites/)
    expect(() => normalizeReport('{}')).toThrow()
  })

  it('agrees with the stats block of the sample report', () => {
    const { tests } = normalizeReport(sampleReport)
    const count = (status) => tests.filter((entry) => entry.status === status).length

    expect(tests).toHaveLength(sampleReport.stats.expected + sampleReport.stats.unexpected + sampleReport.stats.flaky + sampleReport.stats.skipped)
    expect(count('passed')).toBe(sampleReport.stats.expected)
    expect(count('failed')).toBe(sampleReport.stats.unexpected)
    expect(count('flaky')).toBe(sampleReport.stats.flaky)
    expect(count('skipped')).toBe(sampleReport.stats.skipped)
    expect(count('unknown')).toBe(0)
    expect(new Set(tests.map((entry) => entry.id)).size).toBe(tests.length)
  })
})

describe('formatDuration', () => {
  it('switches unit with the magnitude', () => {
    expect(formatDuration(0)).toBe('0 ms')
    expect(formatDuration(842)).toBe('842 ms')
    expect(formatDuration(1250)).toBe('1.3 s')
    expect(formatDuration(91055)).toBe('1 min 31 s')
  })

  it('does not choke on missing numbers', () => {
    expect(formatDuration(undefined)).toBe('0 ms')
    expect(formatDuration(-5)).toBe('0 ms')
  })
})
