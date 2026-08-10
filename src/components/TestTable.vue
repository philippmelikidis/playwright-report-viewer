<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { formatDuration } from '../format.js'
import { CHANGE_LABELS, testKey } from '../compare.js'
import { DEFAULT_VIEW, parseViewState, toQueryString } from '../view-state.js'

const props = defineProps({
  tests: { type: Array, required: true },
  changes: { type: Map, default: null }
})

const STATUSES = ['passed', 'failed', 'flaky', 'skipped', 'unknown']

const view = reactive(parseViewState(window.location.search))
const expanded = ref(new Set())
const collapsed = ref(new Set())

watch(view, () => {
  const url = `${window.location.pathname}${toQueryString(view, DEFAULT_VIEW)}`
  window.history.replaceState(null, '', url)
})

const columnCount = computed(() => (props.changes ? 6 : 5))

function changeOf(test) {
  return props.changes?.get(testKey(test)) ?? null
}

function changeLabel(test) {
  return CHANGE_LABELS[changeOf(test)?.kind] || ''
}

function deltaLabel(test) {
  const delta = changeOf(test)?.delta ?? 0
  if (Math.abs(delta) < 250) return ''
  return `${delta > 0 ? '+' : '-'}${formatDuration(Math.abs(delta))}`
}

const projects = computed(() => [...new Set(props.tests.map((test) => test.project).filter(Boolean))])

// A link can name a project that the loaded report does not have.
watch(projects, (available) => {
  if (view.project !== 'all' && !available.includes(view.project)) {
    view.project = 'all'
  }
}, { immediate: true })

// The status counts follow the selected project, otherwise a chip promises rows
// that the project filter then hides.
const scopedTests = computed(() =>
  view.project === 'all'
    ? props.tests
    : props.tests.filter((test) => test.project === view.project)
)

const filters = computed(() => {
  const available = STATUSES
    .map((status) => ({
      value: status,
      label: status[0].toUpperCase() + status.slice(1),
      count: scopedTests.value.filter((test) => test.status === status).length
    }))
    // "unknown" only shows up for reports with statuses this viewer does not map.
    .filter((filter) => filter.value !== 'unknown' || filter.count > 0)

  return [{ value: 'all', label: 'All', count: scopedTests.value.length }, ...available]
})

const visibleTests = computed(() => {
  const term = view.query.trim().toLowerCase()

  const matched = scopedTests.value.filter((test) => {
    if (view.status !== 'all' && test.status !== view.status) return false
    if (view.changed && !changeLabel(test)) return false
    if (!term) return true
    return `${test.suite} ${test.title} ${test.project}`.toLowerCase().includes(term)
  })

  const direction = view.sort === 'desc' ? -1 : 1
  return matched.sort((a, b) => (a.duration - b.duration) * direction)
})

const groups = computed(() => {
  const byFile = new Map()

  for (const test of visibleTests.value) {
    const file = test.file || 'unknown file'
    if (!byFile.has(file)) {
      byFile.set(file, { file, tests: [], duration: 0, failed: 0, flaky: 0, skipped: 0 })
    }

    const group = byFile.get(file)
    group.tests.push(test)
    group.duration += test.duration
    if (test.status in group) group[test.status] += 1
  }

  const direction = view.sort === 'desc' ? -1 : 1
  return [...byFile.values()].sort((a, b) => (a.duration - b.duration) * direction)
})

// One flat list of group headers and test rows keeps the row markup in a single
// place instead of once per view.
const rows = computed(() => {
  if (!view.group) {
    return visibleTests.value.map((test) => ({ kind: 'test', key: test.id, test }))
  }

  return groups.value.flatMap((group) => [
    { kind: 'group', key: `group:${group.file}`, group },
    ...(collapsed.value.has(group.file)
      ? []
      : group.tests.map((test) => ({ kind: 'test', key: test.id, test })))
  ])
})

function toggleDurationSort() {
  view.sort = view.sort === 'desc' ? 'asc' : 'desc'
}

// Refs are unwrapped in template expressions, so the sets are swapped here and
// never handed to the template as a ref.
function withToggled(set, value) {
  const next = new Set(set)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
}

function toggleGroup(file) {
  collapsed.value = withToggled(collapsed.value, file)
}

function toggleRow(test) {
  if (test.error) expanded.value = withToggled(expanded.value, test.id)
}
</script>

<template>
  <section class="panel table-panel">
    <div class="controls">
      <div class="filters">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="button"
          :class="{ 'is-active': view.status === filter.value }"
          type="button"
          @click="view.status = filter.value"
        >
          {{ filter.label }} <span class="count">{{ filter.count }}</span>
        </button>
      </div>

      <div class="lookup">
        <button
          v-if="changes"
          class="button"
          :class="{ 'is-active': view.changed }"
          type="button"
          @click="view.changed = !view.changed"
        >
          Changed only
        </button>

        <button
          class="button"
          :class="{ 'is-active': view.group }"
          type="button"
          @click="view.group = !view.group"
        >
          Group by file
        </button>

        <select v-if="projects.length > 1" v-model="view.project" class="select" aria-label="Filter by project">
          <option value="all">All projects</option>
          <option v-for="project in projects" :key="project" :value="project">{{ project }}</option>
        </select>

        <input
          v-model="view.query"
          class="search"
          type="search"
          placeholder="Filter by suite or test name"
          aria-label="Filter by suite or test name"
        >
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="col-status">Status</th>
          <th>Test</th>
          <th v-if="changes" class="col-change">Change</th>
          <th class="col-project">Project</th>
          <th class="col-attempts">Attempts</th>
          <th class="col-duration">
            <button class="sort" type="button" @click="toggleDurationSort">
              Duration
              <span class="arrow">{{ view.sort === 'desc' ? '↓' : '↑' }}</span>
            </button>
          </th>
        </tr>
      </thead>

      <tbody>
        <template v-for="row in rows" :key="row.key">
          <tr v-if="row.kind === 'group'" class="group-row" @click="toggleGroup(row.group.file)">
            <td :colspan="columnCount - 1">
              <span class="group-toggle">{{ collapsed.has(row.group.file) ? '+' : '-' }}</span>
              <span class="mono">{{ row.group.file }}</span>
              <span class="group-counts">
                {{ row.group.tests.length }} tests
                <span v-if="row.group.failed" class="group-count">
                  <span class="dot failed" />{{ row.group.failed }}
                </span>
                <span v-if="row.group.flaky" class="group-count">
                  <span class="dot flaky" />{{ row.group.flaky }}
                </span>
                <span v-if="row.group.skipped" class="group-count">
                  <span class="dot skipped" />{{ row.group.skipped }}
                </span>
              </span>
            </td>
            <td class="col-duration">{{ formatDuration(row.group.duration) }}</td>
          </tr>

          <template v-else>
            <tr :class="{ clickable: !!row.test.error }" @click="toggleRow(row.test)">
              <td class="col-status">
                <span class="status">
                  <span class="dot" :class="row.test.status" />
                  {{ row.test.status }}
                </span>
              </td>
              <td>
                <span class="suite">{{ row.test.suite }}</span>
                <span class="title mono">{{ row.test.title }}</span>
                <span v-if="row.test.error" class="toggle">
                  {{ expanded.has(row.test.id) ? 'Hide error' : 'Show error' }}
                </span>
              </td>
              <td v-if="changes" class="col-change">
                <span v-if="changeLabel(row.test)" class="change" :class="changeOf(row.test).kind">
                  {{ changeLabel(row.test) }}
                </span>
                <span v-if="deltaLabel(row.test)" class="delta">{{ deltaLabel(row.test) }}</span>
              </td>
              <td class="col-project">{{ row.test.project || '-' }}</td>
              <td class="col-attempts">{{ row.test.attempts }}</td>
              <td class="col-duration">{{ formatDuration(row.test.duration) }}</td>
            </tr>
            <tr v-if="row.test.error && expanded.has(row.test.id)" class="error-row">
              <td :colspan="columnCount">
                <p class="location mono">{{ row.test.file }}:{{ row.test.line }}</p>
                <pre>{{ row.test.error }}</pre>
              </td>
            </tr>
          </template>
        </template>

        <tr v-if="!rows.length">
          <td :colspan="columnCount" class="empty">No test matches the current filter.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.table-panel {
  overflow: hidden;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.count {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.button.is-active .count {
  color: inherit;
}

.lookup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.select {
  padding: 5px 6px;
  font: inherit;
  color: inherit;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
}

.search {
  width: 230px;
  padding: 5px 9px;
  font: inherit;
  color: inherit;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
}

.search:focus {
  outline: none;
  border-color: var(--accent);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 8px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--rule);
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: none;
}

tr.clickable,
.group-row {
  cursor: pointer;
}

tr.clickable:hover {
  background: var(--surface-alt);
}

.group-row td {
  background: var(--surface-group);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.group-row:hover td {
  background: var(--accent-soft);
}

.group-toggle {
  display: inline-block;
  width: 12px;
  color: var(--muted);
  font-family: var(--mono);
}

.group-counts {
  margin-left: 10px;
  color: var(--muted);
  font-size: 12px;
}

.group-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: capitalize;
}

.suite {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.title {
  display: block;
}

.toggle {
  display: inline-block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--accent);
}

.sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.sort:hover {
  color: var(--accent);
}

.arrow {
  font-size: 11px;
}

.col-status {
  width: 108px;
}

.col-change {
  width: 120px;
}

.change {
  display: block;
  text-transform: lowercase;
}

.change.broke,
.change.stillFailing {
  color: var(--failed);
}

.change.fixed {
  color: var(--passed);
}

.change.newFlake {
  color: var(--flaky);
}

.change.new {
  color: var(--accent);
}

.delta {
  display: block;
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.col-project,
.col-attempts {
  width: 92px;
  color: var(--muted);
}

.col-duration {
  width: 108px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

th.col-duration {
  text-align: right;
}

.error-row td {
  padding: 0 14px 12px;
  background: var(--surface-error);
}

.location {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--muted);
}

.error-row pre {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  background: var(--surface);
  border: 1px solid var(--border-error);
  border-radius: 3px;
}

.empty {
  color: var(--muted);
}

@media (max-width: 720px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .lookup {
    flex-direction: column;
  }

  .search {
    width: 100%;
  }

  .col-project,
  .col-attempts {
    display: none;
  }

  .col-change {
    width: auto;
  }
}
</style>
