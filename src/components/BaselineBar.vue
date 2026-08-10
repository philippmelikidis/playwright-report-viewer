<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  baseline: { type: Object, default: null },
  summary: { type: Object, default: null }
})

const emit = defineEmits(['file', 'clear'])
const fileInput = ref(null)

const counts = computed(() => {
  if (!props.summary) return []

  return [
    { key: 'broke', label: 'broke', value: props.summary.broke, tone: 'failed' },
    { key: 'fixed', label: 'fixed', value: props.summary.fixed, tone: 'passed' },
    { key: 'stillFailing', label: 'still failing', value: props.summary.stillFailing, tone: 'failed' },
    { key: 'newFlake', label: 'now flaky', value: props.summary.newFlake, tone: 'flaky' },
    { key: 'new', label: 'new', value: props.summary.new, tone: 'neutral' },
    { key: 'removed', label: 'not in this run', value: props.summary.removed, tone: 'neutral' }
  ].filter((entry) => entry.value > 0)
})

function onChange(event) {
  const [file] = event.target.files || []
  emit('file', file)
  event.target.value = ''
}
</script>

<template>
  <section class="panel baseline">
    <template v-if="baseline">
      <p class="label">
        Compared against <span class="mono">{{ baseline.source }}</span>
      </p>

      <ul v-if="counts.length" class="counts">
        <li v-for="entry in counts" :key="entry.key">
          <span class="value" :class="entry.tone">{{ entry.value }}</span>
          {{ entry.label }}
        </li>
      </ul>
      <p v-else class="label muted">No test changed its status.</p>

      <button class="button" type="button" @click="emit('clear')">Remove baseline</button>
    </template>

    <template v-else>
      <p class="label muted">Load an older results.json to see which tests changed.</p>
      <button class="button" type="button" @click="fileInput.click()">Choose baseline</button>
    </template>

    <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onChange">
  </section>
</template>

<style scoped>
.baseline {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
}

.label {
  margin: 0;
  font-size: 13px;
}

.label.muted {
  color: var(--muted);
}

.counts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0 auto 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--muted);
}

.value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.value.passed {
  color: var(--passed);
}

.value.failed {
  color: var(--failed);
}

.value.flaky {
  color: var(--flaky);
}

.value.neutral {
  color: var(--text);
}

.baseline .button {
  margin-left: auto;
  flex: none;
}

.counts + .button,
.label.muted + .button {
  margin-left: auto;
}

@media (max-width: 720px) {
  .baseline {
    flex-direction: column;
    align-items: flex-start;
  }

  .baseline .button {
    margin-left: 0;
  }
}
</style>
