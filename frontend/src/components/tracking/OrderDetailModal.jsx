import { useEffect, useState } from 'react'
import { orderApi } from '../../api/orderApi'
import { Modal } from '../common/Modal'
import { StatusBadge } from '../common/StatusBadge'
import { TrackingTimeline } from './TrackingTimeline'
import { DeliveryAttemptsList } from './DeliveryAttemptsList'
import { formatCurrency, formatDate } from '../../utils/formatters'

export function OrderDetailModal({ isOpen, onClose, orderId }) {
  const [order, setOrder] = useState(null)
  const [tracking, setTracking] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'tracking' | 'attempts'

  useEffect(() => {
    if (!isOpen || !orderId) return

    let isMounted = true

    const loadData = async () => {
      try {
        const [orderData, trackingData, attemptsData] = await Promise.all([
          orderApi.getOrderById(orderId),
          orderApi.getTrackingHistory(orderId).catch(() => []),
          orderApi.getDeliveryAttempts(orderId).catch(() => []),
        ])
        if (isMounted) {
          setOrder(orderData)
          setTracking(trackingData || [])
          setAttempts(attemptsData || [])
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load order details')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [isOpen, orderId])

  const handleClose = () => {
    setOrder(null)
    setTracking([])
    setAttempts([])
    setError('')
    setActiveTab('details')
    setLoading(true)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={order ? `Order #${order.id}` : 'Order Details'}
      subtitle={order ? `${order.orderType} - ${order.paymentType}` : 'Delivery Tracker'}
      maxWidth="680px"
    >
      {loading ? (
        <div className="modal-loading">Loading order details...</div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : order ? (
        <div className="order-modal-body">
          {/* Header Status & Price */}
          <div className="order-summary-strip">
            <div>
              <span className="label">Current Status</span>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div className="summary-charge">
              <span className="label">Final Charge</span>
              <strong>{formatCurrency(order.finalCharge)}</strong>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="order-tabs">
            <button
              className={`order-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details & Route
            </button>
            <button
              className={`order-tab ${activeTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracking')}
            >
              Tracking History ({tracking.length})
            </button>
            <button
              className={`order-tab ${activeTab === 'attempts' ? 'active' : ''}`}
              onClick={() => setActiveTab('attempts')}
            >
              Delivery Attempts ({attempts.length})
            </button>
          </div>

          {/* Tab 1: Details */}
          {activeTab === 'details' && (
            <div className="order-details-grid">
              <div className="detail-card">
                <h4>Route Information</h4>
                <div className="route-block">
                  <div className="route-stop">
                    <span className="route-dot pickup-dot" />
                    <div>
                      <small>
                        Pickup Zone: <strong>{order.pickupZone || 'N/A'}</strong>
                      </small>
                      <p>{order.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="route-stop">
                    <span className="route-dot drop-dot" />
                    <div>
                      <small>
                        Drop Zone: <strong>{order.dropZone || 'N/A'}</strong>
                      </small>
                      <p>{order.dropAddress}</p>
                    </div>
                  </div>
                </div>

                {order.currentLatitude && order.currentLongitude && (
                  <div style={{ marginTop: '14px', padding: '10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                      📍 Real-Time GPS Tracking Broadcast
                    </p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                      Latitude: <strong>{order.currentLatitude}</strong>, Longitude: <strong>{order.currentLongitude}</strong>
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${order.currentLatitude},${order.currentLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-table-primary"
                      style={{ display: 'inline-block', fontSize: '12px', padding: '4px 10px', textDecoration: 'none' }}
                    >
                      Open Live Map &rarr;
                    </a>
                  </div>
                )}

                {order.podUrl && (
                  <div style={{ marginTop: '14px', padding: '10px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#1e40af' }}>
                      📦 Digital Proof of Delivery (POD)
                    </p>
                    <a
                      href={order.podUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-table-primary"
                      style={{ display: 'inline-block', fontSize: '12px', padding: '4px 10px', textDecoration: 'none' }}
                    >
                      View POD Document / Photo &rarr;
                    </a>
                  </div>
                )}
              </div>

              <div className="detail-card">
                <h4>Parcel & Pricing Specs</h4>
                <div className="specs-table">
                  <div className="spec-row">
                    <span>Chargeable Weight:</span>
                    <strong>{order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}</strong>
                  </div>
                  <div className="spec-row">
                    <span>Order Type:</span>
                    <span>{order.orderType}</span>
                  </div>
                  <div className="spec-row">
                    <span>Payment Type:</span>
                    <span>{order.paymentType}</span>
                  </div>
                  <div className="spec-row">
                    <span>Created Date:</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="spec-row">
                    <span>Assigned Agent:</span>
                    <span>{order.deliveryAgentId ? `Agent #${order.deliveryAgentId}` : 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Tracking */}
          {activeTab === 'tracking' && <TrackingTimeline history={tracking} />}

          {/* Tab 3: Attempts */}
          {activeTab === 'attempts' && <DeliveryAttemptsList attempts={attempts} />}
        </div>
      ) : null}
    </Modal>
  )
}
