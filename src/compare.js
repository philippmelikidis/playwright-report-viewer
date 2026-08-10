// Compares the loaded report against a baseline report. Tests are matched by
// project, suite path and title, which is the closest thing to a stable
// identity across two runs: the spec id changes as soon as a file is edited.

export function testKey(test) {
  return `${test.project}|${test.suite}|${test.title}`
}

function changeKind(before, after) {
  if (after === 'failed') return before === 'failed' ? 'stillFailing' : 'broke'
  if (after === 'flaky' && before !== 'flaky') return 'newFlake'
  if (after === 'passed' && (before === 'failed' || before === 'flaky')) return 'fixed'
  return 'unchanged'
}

export const CHANGE_LABELS = {
  new: 'new',
  broke: 'broke',
  fixed: 'fixed',
  stillFailing: 'still failing',
  newFlake: 'now flaky',
  unchanged: ''
}

export function compareReports(current, baseline) {
  const remaining = new Map(baseline.map((test) => [testKey(test), test]))
  const changes = new Map()
  const summary = { new: 0, broke: 0, fixed: 0, stillFailing: 0, newFlake: 0, unchanged: 0, removed: 0 }

  for (const test of current) {
    const key = testKey(test)
    const before = remaining.get(key)

    if (!before) {
      changes.set(key, { kind: 'new', delta: 0 })
      summary.new += 1
      continue
    }

    remaining.delete(key)
    const kind = changeKind(before.status, test.status)
    changes.set(key, { kind, delta: test.duration - before.duration })
    summary[kind] += 1
  }

  const removed = [...remaining.values()]
  summary.removed = removed.length

  return { changes, summary, removed }
}
