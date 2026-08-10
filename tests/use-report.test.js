import { describe, expect, it } from 'vitest'
import { useReport } from '../src/composables/useReport.js'

function fakeFile(name, content) {
  return { name, text: () => Promise.resolve(content) }
}

describe('useReport', () => {
  it('loads the bundled sample and marks it as synthetic', () => {
    const report = useReport()
    report.loadSample()

    expect(report.tests.value.length).toBeGreaterThan(0)
    expect(report.synthetic.value).toBe(true)
    expect(report.source.value).toBe('sample-report.json')
    expect(report.error.value).toBe('')
    expect(report.summary.value.passed).toBeGreaterThan(0)
  })

  it('reports broken json and keeps the report that is on screen', async () => {
    const report = useReport()
    report.loadSample()
    const before = report.tests.value.length

    await report.loadFile(fakeFile('results.json', '{"suites": ['))

    expect(report.error.value).toMatch(/is not valid JSON/)
    expect(report.tests.value).toHaveLength(before)
  })

  it('refuses a file that is not json before parsing it', async () => {
    const report = useReport()

    await report.loadFile(fakeFile('trace.zip', 'PK'))

    expect(report.error.value).toMatch(/is not a JSON file/)
  })

  it('replaces the sample with an uploaded report', async () => {
    const report = useReport()
    report.loadSample()

    await report.loadFile(
      fakeFile('results.json', JSON.stringify({
        suites: [{ title: 'smoke.spec.ts', specs: [{ title: 'starts', tests: [{ projectName: 'chromium', status: 'expected', results: [{ status: 'passed', duration: 120, retry: 0 }] }] }] }],
        config: { version: '1.48.0', workers: 1, retries: 0 },
        stats: { duration: 900 }
      }))
    )

    expect(report.error.value).toBe('')
    expect(report.synthetic.value).toBe(false)
    expect(report.source.value).toBe('results.json')
    expect(report.tests.value).toHaveLength(1)
    expect(report.summary.value).toEqual({ passed: 1, failed: 0, flaky: 0, skipped: 0, unknown: 0, duration: 900 })
    expect(report.run.value.version).toBe('1.48.0')
  })
})
