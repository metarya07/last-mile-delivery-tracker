import { StatusBadge } from '../common/StatusBadge'

export function TrackingTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No tracking events recorded yet.</p>
      </div>
    )
  }

  // Ensure chronological order
  const sorted = [...history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return (
    <div className="tracking-timeline">
      <h3 className="section-title">Tracking History</h3>
      <ol className="timeline-list">
        {sorted.map((item, index) => {
          const isLatest = index === sorted.length - 1
          const date = new Date(item.createdAt).toLocaleString()

          return (
            <li key={item.id ?? index} className={`timeline-item ${isLatest ? 'latest' : ''}`}>
              <div className="timeline-marker" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <StatusBadge status={item.status} />
                  <time className="timeline-time">{date}</time>
                </div>
                {item.actorName && (
                  <p className="timeline-actor">
                    Updated by: <strong>{item.actorName}</strong>
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
