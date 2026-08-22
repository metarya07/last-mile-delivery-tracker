import { useEffect, useState } from 'react'
import { orderApi } from '../api/orderApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AssignAgentModal } from '../components/admin/AssignAgentModal'
import { AgentListModal } from '../components/admin/AgentListModal'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'

export function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [assignModalOrder, setAssignModalOrder] = useState(null)
  const [statusModalOrder, setStatusModalOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [agentListOpen, setAgentListOpen] = useState(false)
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
          setError(err.message || 'Failed to fetch admin system orders.')
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

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    )
    setRefreshIndex((prev) => prev + 1)
  }

  return (
    <div className="dashboard-content">
      {/* Top Banner */}
      <div className="section-toolbar">
        <div>
          <h2>System Control Center</h2>
          <p className="subtitle">Global fleet operations, dispatch assignments, and lifecycle monitoring.</p>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAgentListOpen(true)}
          >
            Fleet Directory
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Metrics Row */}
      <section className="metrics-grid metrics-admin">
        <MetricCard label="Total Orders" value={summary.total ?? orders.length} />
        <MetricCard label="Placed / New" value={summary.PLACED ?? 0} />
        <MetricCard label="In Transit" value={summary.IN_TRANSIT ?? 0} />
        <MetricCard label="Out for Delivery" value={summary.OUT_FOR_DELIVERY ?? 0} />
        <MetricCard label="Delivered" value={summary.DELIVERED ?? 0} />
        <MetricCard label="Failed" value={summary.FAILED ?? 0} />
        <MetricCard label="Rescheduled" value={summary.RESCHEDULED ?? 0} />
      </section>

      {/* All Orders Table */}
      <section className="panel">
        <div className="heading">
          <div>
            <p className="eyebrow">GLOBAL REGISTRY</p>
            <h2>All System Orders</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshingâ€¦' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p className="loading-state">Loading system-wide ordersâ€¦</p>
        ) : orders.length === 0 ? (
          <p className="empty-state">No orders registered in the system yet.</p>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer ID</th>
                  <th>Assigned Agent</th>
                  <th>Route</th>
                  <th>Charge</th>
                  <th>Status</th>
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
                      <span>User #{order.customerId}</span>
                    </td>
                    <td>
                      {order.deliveryAgentId ? (
                        <span className="badge-agent-assigned">Agent #{order.deliveryAgentId}</span>
                      ) : (
                        <span className="badge-agent-unassigned">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div className="route-cell">
                        <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                        <span className="route-address" title={order.dropAddress}>
                          {order.dropAddress}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>â‚¹{order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'}</strong>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-table-primary"
                          onClick={() => setAssignModalOrder(order)}
                          title="Assign delivery agent"
                        >
                          {order.deliveryAgentId ? 'Reassign' : 'Assign'}
                        </button>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setStatusModalOrder(order)}
                          disabled={order.status === 'DELIVERED'}
                          title="Force transition status"
                        >
                          Status
                        </button>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setSelectedOrderId(order.id)}
                          title="View complete details and tracking"
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

      {/* Assign Agent Modal */}
      <AssignAgentModal
        isOpen={!!assignModalOrder}
        onClose={() => setAssignModalOrder(null)}
        order={assignModalOrder}
        onAssigned={handleOrderUpdated}
      />

      {/* Status Transition Modal */}
      <StatusTransitionModal
        isOpen={!!statusModalOrder}
        onClose={() => setStatusModalOrder(null)}
        order={statusModalOrder}
        onStatusUpdated={handleOrderUpdated}
      />

      {/* Order Details & Tracking Modal */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />

      {/* Fleet Directory Modal */}
      <AgentListModal
        isOpen={agentListOpen}
        onClose={() => setAgentListOpen(false)}
      />
    </div>
  )
}
