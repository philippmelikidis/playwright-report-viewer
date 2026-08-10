// The table state lives in the query string so a filtered view can be shared as
// a link. Only values that differ from the default are written, which keeps the
// url empty for the plain view.

export const DEFAULT_VIEW = { status: 'all', project: 'all', query: '', sort: 'desc', group: false, changed: false }

const STATUS_VALUES = ['all', 'passed', 'failed', 'flaky', 'skipped', 'unknown']
const SORT_VALUES = ['asc', 'desc']

export function parseViewState(search, defaults = DEFAULT_VIEW) {
  const params = new URLSearchParams(search || '')
  const status = params.get('status')
  const sort = params.get('sort')

  return {
    status: STATUS_VALUES.includes(status) ? status : defaults.status,
    project: params.get('project') || defaults.project,
    query: params.get('q') || defaults.query,
    sort: SORT_VALUES.includes(sort) ? sort : defaults.sort,
    group: params.has('group') ? params.get('group') === 'file' : defaults.group,
    changed: params.has('changed') ? params.get('changed') === '1' : defaults.changed
  }
}

export function toQueryString(view, defaults = DEFAULT_VIEW) {
  const params = new URLSearchParams()

  if (view.status !== defaults.status) params.set('status', view.status)
  if (view.project !== defaults.project) params.set('project', view.project)
  if (view.query.trim()) params.set('q', view.query.trim())
  if (view.sort !== defaults.sort) params.set('sort', view.sort)
  if (view.group !== defaults.group) params.set('group', view.group ? 'file' : 'none')
  if (view.changed !== defaults.changed) params.set('changed', view.changed ? '1' : '0')

  const query = params.toString()
  return query ? `?${query}` : ''
}
