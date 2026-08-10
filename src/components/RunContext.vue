<script setup>
import { computed } from 'vue'

const props = defineProps({
  run: { type: Object, required: true }
})

const items = computed(() => {
  const { version, workers, retries, shard, projects } = props.run

  return [
    version ? { key: 'version', label: 'Playwright', value: version } : null,
    workers ? { key: 'workers', label: 'Workers', value: String(workers) } : null,
    retries === null ? null : { key: 'retries', label: 'Retries', value: String(retries) },
    shard ? { key: 'shard', label: 'Shard', value: shard } : null,
    projects.length ? { key: 'projects', label: 'Projects', value: projects.join(', ') } : null
  ].filter(Boolean)
})
</script>

<template>
  <dl v-if="items.length" class="context">
    <div v-for="item in items" :key="item.key">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.context {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin: 0;
  padding: 0 2px;
  font-size: 12px;
}

.context div {
  display: flex;
  gap: 6px;
}

dt {
  color: var(--muted);
}

dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
</style>
