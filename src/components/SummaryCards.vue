<script setup>
import { computed } from 'vue'
import { formatDuration } from '../format.js'

const props = defineProps({
  summary: { type: Object, required: true }
})

const cards = computed(() => [
  { key: 'passed', label: 'Passed', value: props.summary.passed },
  { key: 'failed', label: 'Failed', value: props.summary.failed },
  { key: 'flaky', label: 'Flaky', value: props.summary.flaky },
  { key: 'skipped', label: 'Skipped', value: props.summary.skipped },
  { key: 'duration', label: 'Duration', value: formatDuration(props.summary.duration) }
])
</script>

<template>
  <ul class="cards">
    <li v-for="card in cards" :key="card.key" class="panel card">
      <span class="label">
        <span v-if="card.key !== 'duration'" class="dot" :class="card.key"></span>
        {{ card.label }}
      </span>
      <strong class="value">{{ card.value }}</strong>
    </li>
  </ul>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  padding: 12px 14px;
}

.label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.value {
  display: block;
  margin-top: 4px;
  font-size: 21px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
