<script setup>
import { ref } from 'vue'

defineProps({
  source: { type: String, default: '' },
  startedAt: { type: String, default: '' }
})

const emit = defineEmits(['file', 'sample'])
const fileInput = ref(null)

function onChange(event) {
  const [file] = event.target.files || []
  emit('file', file)
  // Reset so picking the same file twice triggers a fresh read.
  event.target.value = ''
}

function formatStart(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}
</script>

<template>
  <div class="source">
    <p v-if="source" class="meta">
      <span class="mono">{{ source }}</span>
      <span v-if="startedAt" class="started">started {{ formatStart(startedAt) }}</span>
    </p>

    <div class="actions">
      <button class="button" type="button" @click="fileInput.click()">Open results.json</button>
      <button class="button" type="button" @click="emit('sample')">Load sample</button>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onChange">
    </div>
  </div>
</template>

<style scoped>
.source {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta {
  display: flex;
  flex-direction: column;
  margin: 0;
  font-size: 12px;
}

.started {
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 6px;
}
</style>
