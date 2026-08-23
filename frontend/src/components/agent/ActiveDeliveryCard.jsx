import { useState } from 'react'
import { StatusBadge } from '../common/StatusBadge'
import { formatCurrency } from '../../utils/formatters'
import { IconArrowRight } from '../common/Icons'
import { orderApi } from '../../api/orderApi'

export function ActiveDeliveryCard({ order, onUpdateStatus, onViewDetails, onOrderUpdated }) {
  const [broadcastingGps, setBroadcastingGps] = useState(false)
  const [gpsFeedback, setGpsFeedback] = useState('')

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

  const handleBroadcastGps = () => {
    if (!navigator.geolocation) {
      setGpsFeedback('Geolocation is not supported by your device browser.')
      return
    }

    setBroadcastingGps(true)
    setGpsFeedback('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          const updated = await orderApi.updateLocation(order.id, { latitude: lat, longitude: lng })
          setGpsFeedback(`📍 GPS broadcasted: (${lat}, ${lng})`)
          if (onOrderUpdated) onOrderUpdated(updated)
        } catch (err) {
          setGpsFeedback(`GPS update failed: ${err.message}`)
        } finally {
          setBroadcastingGps(false)
        }
      },
      (err) => {
        setBroadcastingGps(false)
        setGpsFeedback(`GPS acquisition error: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
              <span className="cod-alert">Collect {formatCurrency(order.finalCharge)}</span>
            )}
          </div>
          <div className="meta-pill">
            <span>Order Type:</span> <strong>{order.orderType}</strong>
          </div>
          <div className="meta-pill">
            <span>Weight:</span> <strong>{order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}</strong>
          </div>
          {order.currentLatitude && order.currentLongitude && (
            <div className="meta-pill">
              <span>GPS:</span> <strong>{order.currentLatitude}, {order.currentLongitude}</strong>
            </div>
          )}
        </div>
      </div>

      {gpsFeedback && (
        <div style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-muted, #475569)' }}>
          {gpsFeedback}
        </div>
      )}

      <div className="active-run-footer">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onUpdateStatus(order)}
          disabled={order.status === 'DELIVERED'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>Advance / Update Status</span>
          <IconArrowRight size={16} />
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleBroadcastGps}
          disabled={broadcastingGps || order.status === 'DELIVERED'}
        >
          {broadcastingGps ? 'Broadcasting GPS...' : '📍 Broadcast Live GPS'}
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
