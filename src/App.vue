<script setup>
import { ref } from 'vue'
import ReportSource from './components/ReportSource.vue'
import RunContext from './components/RunContext.vue'
import SummaryCards from './components/SummaryCards.vue'
import SlowestTests from './components/SlowestTests.vue'
import TestTable from './components/TestTable.vue'
import { useReport } from './composables/useReport.js'

const { tests, summary, run, source, startedAt, synthetic, error, loadSample, loadFile } = useReport()

const dropTarget = ref(false)

function onDrop(event) {
  dropTarget.value = false
  const [file] = event.dataTransfer?.files || []
  if (file) loadFile(file)
}

loadSample()
</script>

<template>
  <div
    class="app"
    :class="{ 'is-drop-target': dropTarget }"
    @dragover.prevent="dropTarget = true"
    @dragleave="dropTarget = false"
    @drop.prevent="onDrop"
  >
    <header class="topbar">
      <div class="inner">
        <h1>Playwright Report Viewer</h1>
        <ReportSource
          :source="source"
          :started-at="startedAt"
          :synthetic="synthetic"
          @file="loadFile"
          @sample="loadSample"
        />
      </div>
    </header>

    <main>
      <p v-if="error" class="notice">{{ error }}</p>

      <template v-if="tests.length">
        <RunContext :run="run" />
        <SummaryCards :summary="summary" />
        <SlowestTests :tests="tests" />
        <TestTable :tests="tests" />
      </template>

      <p v-else-if="!error" class="notice muted">
        This report contains no tests. Open another results.json to continue.
      </p>
    </main>

    <p v-if="dropTarget" class="drop-hint">Drop results.json to load it</p>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.app.is-drop-target {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 14px 20px;
}

main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px;
}

.notice {
  margin: 0;
  padding: 10px 14px;
  background: #fdf3f2;
  border: 1px solid #f0dcd9;
  border-radius: 3px;
  color: var(--failed);
}

.notice.muted {
  background: var(--surface);
  border-color: var(--border);
  color: var(--muted);
}

.drop-hint {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 7px 14px;
  color: var(--surface);
  background: var(--accent);
  border-radius: 3px;
  pointer-events: none;
}

@media (max-width: 720px) {
  .inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
