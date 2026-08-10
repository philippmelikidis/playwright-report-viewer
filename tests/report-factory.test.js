import { describe, expect, it } from 'vitest'
import { ERRORS, buildReport, createRandom, randomPlan } from '../src/report-factory.js'
import { normalizeReport } from '../src/composables/useReport.js'

const plan = [
  {
    file: 'demo.spec.ts',
    describe: 'group',
    projects: ['chromium', 'webkit'],
    specs: [
      { title: 'passes', line: 8, ms: 500, outcomes: null, error: null },
      { title: 'fails in webkit', line: 19, ms: 700, outcomes: { webkit: 'failed' }, error: ERRORS.textMismatch },
      { title: 'runs into the timeout', line: 30, ms: 900, outcomes: 'timedOut', error: ERRORS.locatorTimeout },
      { title: 'is flaky in chromium', line: 41, ms: 600, outcomes: { chromium: 'flaky' }, error: ERRORS.urlMismatch },
      { title: 'is skipped', line: 52, ms: 0, outcomes: 'skipped', error: null }
    ]
  }
]

describe('createRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = createRandom(99)
    const second = createRandom(99)

    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })
})

describe('buildReport', () => {
  it('produces a report the normalizer reads back as intended', () => {
    const report = buildReport({ plan, retries: 2, workers: 4, seed: 3 })
    const { tests, run } = normalizeReport(report)

    expect(run).toMatchObject({ workers: 4, retries: 2, projects: ['chromium', 'webkit'] })
    expect(tests).toHaveLength(10)

    const status = (title, project) =>
      tests.find((test) => test.title === title && test.project === project).status

    expect(status('passes', 'chromium')).toBe('passed')
    expect(status('fails in webkit', 'webkit')).toBe('failed')
    expect(status('fails in webkit', 'chromium')).toBe('passed')
    expect(status('runs into the timeout', 'chromium')).toBe('failed')
    expect(status('is flaky in chromium', 'chromium')).toBe('flaky')
    expect(status('is flaky in chromium', 'webkit')).toBe('passed')
    expect(status('is skipped', 'chromium')).toBe('skipped')
  })

  it('agrees with its own stats block', () => {
    const report = buildReport({ plan, seed: 5 })
    const { tests } = normalizeReport(report)
    const count = (status) => tests.filter((test) => test.status === status).length

    expect(count('passed')).toBe(report.stats.expected)
    expect(count('failed')).toBe(report.stats.unexpected)
    expect(count('flaky')).toBe(report.stats.flaky)
    expect(count('skipped')).toBe(report.stats.skipped)
    expect(count('unknown')).toBe(0)
  })

  it('retries a failing test and keeps a passing test at one attempt', () => {
    const { tests } = normalizeReport(buildReport({ plan, retries: 2, seed: 8 }))

    expect(tests.find((test) => test.title === 'passes').attempts).toBe(1)
    expect(tests.find((test) => test.title === 'runs into the timeout').attempts).toBe(3)
    expect(tests.find((test) => test.status === 'flaky').attempts).toBe(2)
  })

  it('never lets an attempt pass beyond the test timeout', () => {
    const report = buildReport({ plan: randomPlan({ files: 6, specsPerFile: 8, projects: ['chromium', 'firefox'], seed: 21 }), seed: 21 })
    const attempts = []
    const walk = (suites) => {
      for (const suite of suites) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests) attempts.push(...test.results)
        }
        walk(suite.suites || [])
      }
    }
    walk(report.suites)

    const overrunning = attempts.filter((result) => result.duration > 30000 && result.status !== 'timedOut')
    expect(overrunning).toHaveLength(0)
  })
})

describe('randomPlan', () => {
  it('is reproducible and stays inside the requested size', () => {
    const options = { files: 3, specsPerFile: 5, projects: ['chromium'], seed: 12 }
    const plans = [randomPlan(options), randomPlan(options)]

    expect(plans[0]).toEqual(plans[1])
    expect(new Set(plans[0].map((block) => block.file)).size).toBe(3)
    expect(plans[0].reduce((total, block) => total + block.specs.length, 0)).toBe(15)
  })

  it('keeps the spec titles inside a file unique', () => {
    const plan = randomPlan({ files: 5, specsPerFile: 8, projects: ['chromium'], seed: 77 })

    for (const file of new Set(plan.map((block) => block.file))) {
      const titles = plan.filter((block) => block.file === file).flatMap((block) => block.specs.map((spec) => spec.title))
      expect(new Set(titles).size).toBe(titles.length)
    }
  })

  it('produces no failures when the rates are zero', () => {
    const report = buildReport({ plan: randomPlan({ failureRate: 0, flakeRate: 0, skipRate: 0, seed: 4 }), seed: 4 })

    expect(report.stats.unexpected).toBe(0)
    expect(report.stats.flaky).toBe(0)
    expect(report.stats.skipped).toBe(0)
  })
})
