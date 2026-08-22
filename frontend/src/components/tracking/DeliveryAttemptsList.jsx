import { StatusBadge } from '../common/StatusBadge'

export function DeliveryAttemptsList({ attempts = [] }) {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="attempts-empty">
        <p>No delivery attempts recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="delivery-attempts">
      <h3 className="section-title">Delivery Attempts ({attempts.length})</h3>
      <div className="attempts-list">
        {attempts.map((attempt) => {
          const date = new Date(attempt.attemptedAt).toLocaleString()
          return (
            <div key={attempt.id || attempt.attemptNumber} className="attempt-card">
              <div className="attempt-header">
                <div>
                  <strong>Attempt #{attempt.attemptNumber}</strong>
                  <span className="attempt-time">{date}</span>
                </div>
                <StatusBadge status={attempt.status} />
              </div>
              {attempt.deliveryAgentName && (
                <p className="attempt-agent">
                  Agent: <span>{attempt.deliveryAgentName}</span>
                </p>
              )}
              {attempt.failureReason && (
                <div className="attempt-reason">
                  <strong>Reason:</strong> <span>{attempt.failureReason}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
