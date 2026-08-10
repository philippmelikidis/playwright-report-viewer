<script setup>
import ReportSource from './components/ReportSource.vue'
import SummaryCards from './components/SummaryCards.vue'
import SlowestTests from './components/SlowestTests.vue'
import TestTable from './components/TestTable.vue'
import { useReport } from './composables/useReport.js'

const { tests, summary, source, startedAt, error, loadSample, loadFile } = useReport()

loadSample()
</script>

<template>
  <header class="topbar">
    <div class="inner">
      <h1>Playwright Report Viewer</h1>
      <ReportSource
        :source="source"
        :started-at="startedAt"
        @file="loadFile"
        @sample="loadSample"
      />
    </div>
  </header>

  <main>
    <p v-if="error" class="notice">{{ error }}</p>

    <template v-if="tests.length">
      <SummaryCards :summary="summary" />
      <SlowestTests :tests="tests" />
      <TestTable :tests="tests" />
    </template>

    <p v-else-if="!error" class="notice muted">
      This report contains no tests. Open another results.json to continue.
    </p>
  </main>
</template>

<style scoped>
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

@media (max-width: 720px) {
  .inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
