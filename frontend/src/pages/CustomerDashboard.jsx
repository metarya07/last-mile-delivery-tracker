import { useEffect, useState } from 'react'
import { orderApi } from '../api/orderApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { CreateOrderModal } from '../components/customer/CreateOrderModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'

export function CustomerDashboard() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        const [orderList, summaryData] = await Promise.all([
          orderApi.getMyOrders(),
          dashboardApi.getSummary().catch(() => ({})),
        ])
        if (isMounted) {
          setOrders(orderList || [])
          setSummary(summaryData || {})
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch customer orders.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [refreshIndex])

  const handleRefresh = () => {
    setLoading(true)
    setRefreshIndex((prev) => prev + 1)
  }

  const handleOrderCreated = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev])
    setRefreshIndex((prev) => prev + 1)
  }

  return (
    <div className="dashboard-content">
      {/* Top Banner / Actions */}
      <div className="section-toolbar">
        <div>
          <h2>Customer Operations Desk</h2>
          <p className="subtitle">Manage shipments, track delivery lifecycle, and book dispatches.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setCreateModalOpen(true)}
        >
          + Book New Delivery
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Metrics Row */}
      <section className="metrics-grid">
        <MetricCard label="Total Orders" value={summary.total ?? orders.length} />
        <MetricCard label="In Transit" value={summary.IN_TRANSIT ?? 0} />
        <MetricCard label="Delivered" value={summary.DELIVERED ?? 0} />
        <MetricCard label="Needs Attention / Failed" value={summary.FAILED ?? 0} />
      </section>

      {/* Orders Table */}
      <section className="panel">
        <div className="heading">
          <div>
            <p className="eyebrow">MY DISPATCHES</p>
            <h2>Order History & Live Tracking</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshingâ€¦' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="loading-state">Loading your shipmentsâ€¦</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>No delivery orders placed yet.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateModalOpen(true)}
              style={{ marginTop: '12px' }}
            >
              Book Your First Delivery
            </button>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Route (Pickup &rarr; Drop)</th>
                  <th>Type & Payment</th>
                  <th>Charge</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.id}</strong>
                    </td>
                    <td>
                      <div className="route-cell">
                        <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                        <span className="route-address" title={order.dropAddress}>
                          To: {order.dropAddress}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-meta">{order.orderType} Â· {order.paymentType}</span>
                    </td>
                    <td>
                      <strong>â‚¹{order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'}</strong>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <span className="time-text">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        Track & Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />

      {/* Order Details & Tracking Modal */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </div>
  )
}
