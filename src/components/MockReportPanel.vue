<script setup>
import { reactive, ref } from 'vue'
import { buildReport, randomPlan } from '../report-factory.js'

const emit = defineEmits(['report'])

const BROWSERS = ['chromium', 'firefox', 'webkit']

const settings = reactive({
  files: 4,
  specsPerFile: 6,
  projects: 2,
  failureRate: 8,
  flakeRate: 5,
  seed: 7
})

const fields = [
  { key: 'files', label: 'Spec files', min: 1, max: 8 },
  { key: 'specsPerFile', label: 'Specs per file', min: 1, max: 16 },
  { key: 'projects', label: 'Projects', min: 1, max: 3 },
  { key: 'failureRate', label: 'Failures %', min: 0, max: 60 },
  { key: 'flakeRate', label: 'Flaky %', min: 0, max: 40 },
  { key: 'seed', label: 'Seed', min: 1, max: 999999 }
]

const generated = ref(null)

function generate() {
  const plan = randomPlan({
    files: settings.files,
    specsPerFile: settings.specsPerFile,
    projects: BROWSERS.slice(0, settings.projects),
    failureRate: settings.failureRate / 100,
    flakeRate: settings.flakeRate / 100,
    seed: settings.seed
  })

  generated.value = buildReport({
    plan,
    workers: 4,
    startTime: new Date().toISOString(),
    seed: settings.seed
  })

  emit('report', generated.value, `generated-seed-${settings.seed}.json`)
}

function download() {
  const blob = new Blob([JSON.stringify(generated.value, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')

  link.href = URL.createObjectURL(blob)
  link.download = `results-seed-${settings.seed}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <section class="panel generator">
    <header>
      <h2>Generate a report</h2>
      <span class="hint">Same seed, same report. Useful to try the viewer without a real run.</span>
    </header>

    <div class="settings">
      <label v-for="field in fields" :key="field.key">
        <span>{{ field.label }}</span>
        <input v-model.number="settings[field.key]" type="number" :min="field.min" :max="field.max">
      </label>
    </div>

    <div class="actions">
      <button class="button" type="button" @click="generate">Generate and load</button>
      <button class="button" type="button" :disabled="!generated" @click="download">Download results.json</button>
    </div>
  </section>
</template>

<style scoped>
.generator {
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

.settings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 12px;
}

label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

input {
  width: 68px;
  padding: 4px 6px;
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
}

input:focus {
  outline: none;
  border-color: var(--accent);
}

.actions {
  display: flex;
  gap: 6px;
}

.button:disabled {
  color: var(--muted);
  border-color: var(--border);
  cursor: default;
}
</style>
