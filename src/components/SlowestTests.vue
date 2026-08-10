<script setup>
import { computed } from 'vue'
import { formatDuration } from '../format.js'

const props = defineProps({
  tests: { type: Array, required: true }
})

const rows = computed(() => {
  const slowest = [...props.tests]
    .filter((test) => test.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)

  const longest = slowest.length ? slowest[0].duration : 0

  return slowest.map((test) => ({
    id: test.id,
    title: test.title,
    project: test.project,
    status: test.status,
    tooltip: `${test.suite} > ${test.title}`,
    value: formatDuration(test.duration),
    // Bars are drawn in a 0 to 100 viewBox that is stretched to the panel width.
    percent: longest ? Math.max(1, (test.duration / longest) * 100) : 0
  }))
})
</script>

<template>
  <section class="panel slowest">
    <header>
      <h2>Slowest tests</h2>
      <span class="hint">Total time per test, retries included</span>
    </header>

    <ol v-if="rows.length" class="rows">
      <li v-for="row in rows" :key="row.id">
        <span class="name" :title="row.tooltip">
          <span class="mono">{{ row.title }}</span>
          <span v-if="row.project" class="project">{{ row.project }}</span>
        </span>
        <svg class="bar" viewBox="0 0 100 10" preserveAspectRatio="none" height="10" aria-hidden="true">
          <rect class="track" x="0" y="0" width="100" height="10" />
          <rect class="fill" :class="row.status" x="0" y="0" :width="row.percent" height="10" />
        </svg>
        <span class="value">{{ row.value }}</span>
      </li>
    </ol>

    <p v-else class="empty">No timing data in this report.</p>
  </section>
</template>

<style scoped>
.slowest {
  padding: 14px;
}

header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  color: var(--muted);
  font-size: 12px;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows li {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr) 68px;
  align-items: center;
  gap: 12px;
}

.name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  overflow: hidden;
  font-size: 12px;
  white-space: nowrap;
}

.name .mono {
  overflow: hidden;
  text-overflow: ellipsis;
}

.project {
  flex: none;
  color: var(--muted);
  font-size: 11px;
}

.bar {
  display: block;
  width: 100%;
}

.track {
  fill: #eef0f1;
}

.fill {
  fill: var(--accent);
}

.fill.failed {
  fill: var(--failed);
}

.fill.flaky {
  fill: var(--flaky);
}

.value {
  color: var(--muted);
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: 0;
  color: var(--muted);
}

@media (max-width: 720px) {
  .rows li {
    grid-template-columns: minmax(0, 1fr) 68px;
  }

  .bar {
    grid-column: 1 / -1;
  }
}
</style>
