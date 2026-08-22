export function MetricCard({ label, value, hint }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      {hint && <small className="metric-hint">{hint}</small>}
    </article>
  )
}
