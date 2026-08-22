import { StatusBadge } from '../common/StatusBadge'

export function ActiveDeliveryCard({ order, onUpdateStatus, onViewDetails }) {
  if (!order) {
    return (
      <div className="active-run-card active-run-empty">
        <div className="active-run-header">
          <p className="eyebrow">FIELD RUN STATUS</p>
          <h3>No Active Delivery In Progress</h3>
        </div>
        <p className="empty-hint">
          You have no orders currently in active progress. Pick an assigned order from your queue below to begin delivery milestones.
        </p>
      </div>
    )
  }

  return (
    <div className="active-run-card">
      <div className="active-run-header">
        <div>
          <span className="live-pulse-badge">ACTIVE RUN</span>
          <h3>Order #{order.id}</h3>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="active-run-grid">
        <div className="active-run-route">
          <div className="route-stop">
            <span className="route-dot pickup-dot" />
            <div>
              <small>Pickup Zone ({order.pickupZone})</small>
              <p>{order.pickupAddress}</p>
            </div>
          </div>
          <div className="route-stop">
            <span className="route-dot drop-dot" />
            <div>
              <small>Drop Zone ({order.dropZone})</small>
              <p><strong>{order.dropAddress}</strong></p>
            </div>
          </div>
        </div>

        <div className="active-run-meta">
          <div className="meta-pill">
            <span>Payment:</span> <strong>{order.paymentType}</strong>
            {order.paymentType === 'COD' && (
              <span className="cod-alert">Collect â‚¹{order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'}</span>
            )}
          </div>
          <div className="meta-pill">
            <span>Order Type:</span> <strong>{order.orderType}</strong>
          </div>
          <div className="meta-pill">
            <span>Weight:</span> <strong>{order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}</strong>
          </div>
        </div>
      </div>

      <div className="active-run-footer">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onUpdateStatus(order)}
          disabled={order.status === 'DELIVERED'}
        >
          âš¡ Advance / Update Status
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onViewDetails(order.id)}
        >
          View Full Details & Attempts
        </button>
      </div>
    </div>
  )
}
