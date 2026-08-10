import { describe, expect, it } from 'vitest'
import { compareReports, testKey } from '../src/compare.js'

function entry(title, status, duration = 1000, project = 'chromium', suite = 'a.spec.ts > group') {
  return { id: `${suite}-${title}-${project}`, title, suite, project, status, duration }
}

describe('compareReports', () => {
  it('labels the status changes', () => {
    const baseline = [
      entry('broke here', 'passed'),
      entry('fixed here', 'failed'),
      entry('still failing', 'failed'),
      entry('now flaky', 'passed'),
      entry('untouched', 'passed'),
      entry('gone', 'passed')
    ]
    const current = [
      entry('broke here', 'failed'),
      entry('fixed here', 'passed'),
      entry('still failing', 'failed'),
      entry('now flaky', 'flaky'),
      entry('untouched', 'passed'),
      entry('brand new', 'passed')
    ]

    const { changes, summary, removed } = compareReports(current, baseline)
    const kind = (title) => changes.get(testKey(entry(title, 'passed'))).kind

    expect(kind('broke here')).toBe('broke')
    expect(kind('fixed here')).toBe('fixed')
    expect(kind('still failing')).toBe('stillFailing')
    expect(kind('now flaky')).toBe('newFlake')
    expect(kind('untouched')).toBe('unchanged')
    expect(kind('brand new')).toBe('new')

    expect(summary).toEqual({
      new: 1,
      broke: 1,
      fixed: 1,
      stillFailing: 1,
      newFlake: 1,
      unchanged: 1,
      removed: 1
    })
    expect(removed.map((test) => test.title)).toEqual(['gone'])
  })

  it('counts a test as fixed when it stops being flaky', () => {
    const { changes } = compareReports([entry('wobbly', 'passed')], [entry('wobbly', 'flaky')])

    expect(changes.get(testKey(entry('wobbly', 'passed'))).kind).toBe('fixed')
  })

  it('treats a skipped test that now fails as broken', () => {
    const { summary } = compareReports([entry('t', 'failed')], [entry('t', 'skipped')])

    expect(summary.broke).toBe(1)
  })

  it('keeps the projects apart', () => {
    const baseline = [entry('same title', 'passed', 1000, 'chromium'), entry('same title', 'passed', 1000, 'webkit')]
    const current = [entry('same title', 'passed', 1000, 'chromium'), entry('same title', 'failed', 1000, 'webkit')]

    const { summary } = compareReports(current, baseline)

    expect(summary.broke).toBe(1)
    expect(summary.unchanged).toBe(1)
    expect(summary.removed).toBe(0)
  })

  it('reports the duration difference per test', () => {
    const { changes } = compareReports([entry('slower', 'passed', 2400)], [entry('slower', 'passed', 1000)])

    expect(changes.get(testKey(entry('slower', 'passed'))).delta).toBe(1400)
  })

  it('calls every test new when the baseline is empty', () => {
    const { summary } = compareReports([entry('a', 'passed'), entry('b', 'failed')], [])

    expect(summary.new).toBe(2)
    expect(summary.removed).toBe(0)
  })
})
