export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0 ms'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes} min ${seconds} s`
}
