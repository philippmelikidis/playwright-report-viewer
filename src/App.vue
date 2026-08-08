<script setup>
</script>

<template>
  <header class="topbar">
    <div class="inner">
      <h1>Playwright Report Viewer</h1>
    </div>
  </header>

  <main>
    <p class="notice muted">No report loaded yet.</p>
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--muted);
}
</style>
