import { useEffect, useState } from 'react'
import { orderApi } from '../api/orderApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AvailabilityToggle } from '../components/agent/AvailabilityToggle'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'

export function AgentDashboard() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusModalOrder, setStatusModalOrder] = useState(null)
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
          setError(err.message || 'Failed to fetch assigned deliveries.')
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

  const handleStatusUpdated = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    )
    setRefreshIndex((prev) => prev + 1)
  }

  return (
    <div className="dashboard-content">
      {/* Top Banner & Availability */}
      <div className="section-toolbar agent-toolbar">
        <div>
          <h2>Delivery Agent Workspace</h2>
          <p className="subtitle">Execute assigned deliveries and update transit milestones.</p>
        </div>
        <AvailabilityToggle />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary Metrics */}
      <section className="metrics-grid">
        <MetricCard label="Assigned Deliveries" value={summary.total ?? orders.length} />
        <MetricCard label="Out for Delivery" value={summary.OUT_FOR_DELIVERY ?? 0} />
        <MetricCard label="Delivered" value={summary.DELIVERED ?? 0} />
        <MetricCard label="Failed Attempts" value={summary.FAILED ?? 0} />
      </section>

      {/* Orders Table */}
      <section className="panel">
        <div className="heading">
          <div>
            <p className="eyebrow">ACTIVE RUNS</p>
            <h2>Assigned Orders</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="loading-state">Loading your assigned runs...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders currently assigned to you.</p>
            <small>Make sure your availability is set to <strong>Online</strong> so dispatchers can assign packages to you.</small>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Pickup Address</th>
                  <th>Delivery Address</th>
                  <th>Status</th>
                  <th>Payment Type</th>
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
                        <span className="route-zones">{order.pickupZone}</span>
                        <span className="route-address">{order.pickupAddress}</span>
                      </div>
                    </td>
                    <td>
                      <div className="route-cell">
                        <span className="route-zones">{order.dropZone}</span>
                        <span className="route-address">{order.dropAddress}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <span className="badge-meta">{order.paymentType}</span>
                    </td>
                    <td>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-primary"
                          onClick={() => setStatusModalOrder(order)}
                          disabled={order.status === 'DELIVERED'}
                        >
                          Update Status
                        </button>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Status Transition Modal */}
      <StatusTransitionModal
        isOpen={!!statusModalOrder}
        onClose={() => setStatusModalOrder(null)}
        order={statusModalOrder}
        onStatusUpdated={handleStatusUpdated}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </div>
  )
}
