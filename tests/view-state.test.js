import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW, parseViewState, toQueryString } from '../src/view-state.js'

describe('parseViewState', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parseViewState('')).toEqual(DEFAULT_VIEW)
    expect(parseViewState(undefined)).toEqual(DEFAULT_VIEW)
  })

  it('reads every part of the view', () => {
    expect(parseViewState('?status=flaky&project=webkit&q=cart&sort=asc&group=file&changed=1')).toEqual({
      status: 'flaky',
      project: 'webkit',
      query: 'cart',
      sort: 'asc',
      group: true,
      changed: true
    })
  })

  it('ignores values it does not know', () => {
    const view = parseViewState('?status=exploded&sort=sideways&group=maybe')

    expect(view.status).toBe('all')
    expect(view.sort).toBe('desc')
    expect(view.group).toBe(false)
  })
})

describe('toQueryString', () => {
  it('stays empty for the default view', () => {
    expect(toQueryString(DEFAULT_VIEW)).toBe('')
  })

  it('writes only what differs from the default', () => {
    expect(toQueryString({ ...DEFAULT_VIEW, status: 'failed', group: true })).toBe('?status=failed&group=file')
  })

  it('trims the search term and drops it when it is blank', () => {
    expect(toQueryString({ ...DEFAULT_VIEW, query: '  discount  ' })).toBe('?q=discount')
    expect(toQueryString({ ...DEFAULT_VIEW, query: '   ' })).toBe('')
  })

  it('survives a round trip', () => {
    const view = { status: 'skipped', project: 'firefox', query: 'checkout', sort: 'asc', group: true, changed: true }

    expect(parseViewState(toQueryString(view))).toEqual(view)
  })
})
