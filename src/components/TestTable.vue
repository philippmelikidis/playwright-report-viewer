<script setup>
import { computed, ref } from 'vue'
import { formatDuration } from '../format.js'

const props = defineProps({
  tests: { type: Array, required: true }
})

const STATUSES = ['passed', 'failed', 'flaky', 'skipped', 'unknown']

const statusFilter = ref('all')
const query = ref('')
const durationSort = ref('desc')
const expanded = ref(new Set())

const filters = computed(() => {
  const available = STATUSES
    .map((status) => ({
      value: status,
      label: status[0].toUpperCase() + status.slice(1),
      count: props.tests.filter((test) => test.status === status).length
    }))
    // "unknown" only shows up for reports with statuses this viewer does not map.
    .filter((filter) => filter.value !== 'unknown' || filter.count > 0)

  return [{ value: 'all', label: 'All', count: props.tests.length }, ...available]
})

const visibleTests = computed(() => {
  const term = query.value.trim().toLowerCase()

  const matched = props.tests.filter((test) => {
    if (statusFilter.value !== 'all' && test.status !== statusFilter.value) return false
    if (!term) return true
    return `${test.suite} ${test.title} ${test.project}`.toLowerCase().includes(term)
  })

  const direction = durationSort.value === 'desc' ? -1 : 1
  return matched.sort((a, b) => (a.duration - b.duration) * direction)
})

function toggleDurationSort() {
  durationSort.value = durationSort.value === 'desc' ? 'asc' : 'desc'
}

function toggleRow(test) {
  if (!test.error) return

  const next = new Set(expanded.value)
  if (next.has(test.id)) {
    next.delete(test.id)
  } else {
    next.add(test.id)
  }
  expanded.value = next
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
          :class="{ 'is-active': statusFilter === filter.value }"
          type="button"
          @click="statusFilter = filter.value"
        >
          {{ filter.label }} <span class="count">{{ filter.count }}</span>
        </button>
      </div>

      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="Filter by suite or test name"
        aria-label="Filter by suite or test name"
      >
    </div>

    <table>
      <thead>
        <tr>
          <th class="col-status">Status</th>
          <th>Test</th>
          <th class="col-project">Project</th>
          <th class="col-attempts">Attempts</th>
          <th class="col-duration">
            <button class="sort" type="button" @click="toggleDurationSort">
              Duration
              <span class="arrow">{{ durationSort === 'desc' ? '↓' : '↑' }}</span>
            </button>
          </th>
        </tr>
      </thead>

      <tbody>
        <template v-for="test in visibleTests" :key="test.id">
          <tr :class="{ clickable: !!test.error }" @click="toggleRow(test)">
            <td class="col-status">
              <span class="status">
                <span class="dot" :class="test.status" />
                {{ test.status }}
              </span>
            </td>
            <td>
              <span class="suite">{{ test.suite }}</span>
              <span class="title mono">{{ test.title }}</span>
              <span v-if="test.error" class="toggle">
                {{ expanded.has(test.id) ? 'Hide error' : 'Show error' }}
              </span>
            </td>
            <td class="col-project">{{ test.project || '-' }}</td>
            <td class="col-attempts">{{ test.attempts }}</td>
            <td class="col-duration">{{ formatDuration(test.duration) }}</td>
          </tr>
          <tr v-if="test.error && expanded.has(test.id)" class="error-row">
            <td colspan="5">
              <p class="location mono">{{ test.file }}:{{ test.line }}</p>
              <pre>{{ test.error }}</pre>
            </td>
          </tr>
        </template>

        <tr v-if="!visibleTests.length">
          <td colspan="5" class="empty">No test matches the current filter.</td>
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

.search {
  width: 260px;
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
  background: #fafbfb;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

td {
  padding: 9px 14px;
  border-bottom: 1px solid #eef0f1;
  vertical-align: top;
}

tbody tr:last-child td {
  border-bottom: none;
}

tr.clickable {
  cursor: pointer;
}

tr.clickable:hover {
  background: #fafbfb;
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
  background: #fdf7f6;
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
  border: 1px solid #f0dcd9;
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

  .search {
    width: 100%;
  }

  .col-project,
  .col-attempts {
    display: none;
  }
}
</style>
