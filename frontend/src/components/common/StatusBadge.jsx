export function StatusBadge({ status }) {
  if (!status) return null
  const formatted = status.replaceAll('_', ' ')
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {formatted}
    </span>
  )
}
