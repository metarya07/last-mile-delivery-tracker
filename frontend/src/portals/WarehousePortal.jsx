import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { userApi } from '../api/userApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconCheck,
  IconRefresh,
  IconMenu,
  IconAlert,
  IconSearch,
} from '../components/common/Icons'
import { formatCurrency, formatShortDate } from '../utils/formatters'

export function WarehousePortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('inventory') // 'inventory' | 'intake' | 'handover' | 'history'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [orders, setOrders] = useState([])
  const [agents, setAgents] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Actions state
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [actionBusyId, setActionBusyId] = useState(null)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [ordersData, agentsData, summaryData] = await Promise.all([
          orderApi.getMyOrders(),
          userApi.getDeliveryAgents().catch(() => []),
          dashboardApi.getSummary().catch(() => ({})),
        ])

        if (isMounted) {
          setOrders(ordersData || [])
          setAgents(agentsData || [])
          setSummary(summaryData || {})
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load warehouse facility packages.')
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

  const handleAdvanceStatus = async (orderId, newStatus) => {
    setActionBusyId(orderId)
    setActionError('')
    setActionSuccess('')
    try {
      const updated = await orderApi.updateStatus(orderId, { status: newStatus })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      setActionSuccess(`Order #${orderId} transitioned to ${newStatus} successfully.`)
      setRefreshIndex((prev) => prev + 1)
    } catch (err) {
      setActionError(err.message || `Failed to update Order #${orderId}.`)
    } finally {
      setActionBusyId(null)
    }
  }

  // Incoming / Intake packages queue (PLACED)
  const intakeQueue = useMemo(() => {
    return orders.filter((o) => o.status === 'PLACED')
  }, [orders])

  // In Hub Processing (PICKED_UP)
  const inHubQueue = useMemo(() => {
    return orders.filter((o) => o.status === 'PICKED_UP')
  }, [orders])

  // Ready for dispatch staging / Handover queue (IN_TRANSIT or assigned)
  const handoverQueue = useMemo(() => {
    return orders.filter((o) => o.status === 'IN_TRANSIT' || (o.status === 'PICKED_UP' && !!o.deliveryAgentId))
  }, [orders])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        o.id?.toString().includes(query) ||
        o.dropAddress?.toLowerCase().includes(query) ||
        o.pickupAddress?.toLowerCase().includes(query)

      return matchStatus && matchQuery
    })
  }, [orders, statusFilter, searchQuery])

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setMobileNavOpen(false)
    setActionError('')
    setActionSuccess('')
  }

  return (
    <div className="portal-shell">
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <IconMenu size={22} />
        </button>
        <div className="mobile-topbar-title">
          <IconPackage size={20} />
          <span>Warehouse Hub</span>
        </div>
      </header>

      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar admin-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="aside-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconPackage size={22} className="brand-icon" />
            <div>
              <p className="eyebrow">FACILITY OPERATIONS</p>
              <h2>Warehouse Hub</h2>
            </div>
          </div>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">HUB OPERATIONS</span>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'inventory' ? 'active' : ''}`}
              onClick={() => switchTab('inventory')}
            >
              <IconPackage size={16} />
              <span>Facility Inventory ({orders.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'intake' ? 'active' : ''}`}
              onClick={() => switchTab('intake')}
            >
              <IconClock size={16} />
              <span>Package Intake {intakeQueue.length > 0 ? `(${intakeQueue.length})` : ''}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'handover' ? 'active' : ''}`}
              onClick={() => switchTab('handover')}
            >
              <IconTruck size={16} />
              <span>Driver Handover ({handoverQueue.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'history' ? 'active' : ''}`}
              onClick={() => switchTab('history')}
            >
              <IconCheck size={16} />
              <span>Fulfilled / Dispatched</span>
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="badge-agent-assigned">WAREHOUSE STAFF</span>
          </div>
          <button type="button" className="btn-secondary signout-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="workspace">
        <div className="workspace-header">
          <div>
            <span className="role-tag">HUB PERSONNEL</span>
            <h1>Parcel Sorting & Staging Console</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
              <IconRefresh size={14} />
              <span>{loading ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {actionSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{actionSuccess}</div>}
        {actionError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{actionError}</div>}

        {/* Metrics Grid */}
        <section className="metrics-grid" style={{ marginBottom: '24px' }}>
          <MetricCard
            label="FACILITY PARCELS"
            value={orders.length}
            trend="Total parcels in hub scope"
          />
          <MetricCard
            label="AWAITING INTAKE"
            value={intakeQueue.length}
            trend="Needs sorting / check-in"
          />
          <MetricCard
            label="STAGED IN HUB"
            value={inHubQueue.length}
            trend="Sorted & ready for transit"
          />
          <MetricCard
            label="DRIVER HANDOVERS"
            value={handoverQueue.length}
            trend="Ready for last-mile pickup"
          />
        </section>

        {/* TAB 1: FACILITY INVENTORY */}
        {currentTab === 'inventory' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Warehouse Parcels Inventory</h2>
                <p className="subtitle">All active packages associated with this distribution facility.</p>
              </div>
            </div>

            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order # or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <section className="panel">
              {filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No parcels currently found matching your filters.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Route</th>
                        <th>Weight</th>
                        <th>Status</th>
                        <th>Assigned Driver</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span>{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td>{order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}</td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            {order.deliveryAgentId ? (
                              <span className="badge-agent-assigned">Agent #{order.deliveryAgentId}</span>
                            ) : (
                              <span className="badge-agent-unassigned">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <div className="table-actions-group">
                              {order.status === 'PLACED' && (
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => handleAdvanceStatus(order.id, 'PICKED_UP')}
                                  disabled={actionBusyId === order.id}
                                >
                                  Intake & Check-In
                                </button>
                              )}
                              {order.status === 'PICKED_UP' && (
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => handleAdvanceStatus(order.id, 'IN_TRANSIT')}
                                  disabled={actionBusyId === order.id}
                                  style={{ background: '#059669', borderColor: '#059669' }}
                                >
                                  Stage for Transit
                                </button>
                              )}
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
          </div>
        )}

        {/* TAB 2: INTAKE QUEUE */}
        {currentTab === 'intake' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Incoming Parcel Intake Desk</h2>
                <p className="subtitle">Scan, verify, and check incoming packages into the warehouse inventory.</p>
              </div>
            </div>

            <section className="panel">
              {intakeQueue.length === 0 ? (
                <div className="empty-state">
                  <IconCheck size={48} className="empty-icon" />
                  <p>All incoming parcels have been checked in!</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup & Drop</th>
                        <th>Weight</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intakeQueue.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span>{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td>{order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}</td>
                          <td>{formatShortDate(order.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-table-primary"
                              onClick={() => handleAdvanceStatus(order.id, 'PICKED_UP')}
                              disabled={actionBusyId === order.id}
                            >
                              Check-In to Facility
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: HANDOVER TO DRIVER */}
        {currentTab === 'handover' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Driver Handover & Outbound Dispatch</h2>
                <p className="subtitle">Hand over staged parcels to assigned last-mile delivery partners.</p>
              </div>
            </div>

            <section className="panel">
              {handoverQueue.length === 0 ? (
                <div className="empty-state">
                  <p>No parcels currently staged for driver handover.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Drop Destination</th>
                        <th>Assigned Driver</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoverQueue.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span>{order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td>
                            {order.deliveryAgentId ? (
                              <span className="badge-agent-assigned">Agent #{order.deliveryAgentId}</span>
                            ) : (
                              <span className="badge-agent-unassigned">Awaiting Allocation</span>
                            )}
                          </td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <div className="table-actions-group">
                              {order.status === 'PICKED_UP' && (
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => handleAdvanceStatus(order.id, 'IN_TRANSIT')}
                                  disabled={actionBusyId === order.id}
                                >
                                  Mark In-Transit
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-table-action"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                Inspect
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
          </div>
        )}

        {/* TAB 4: FULFILLED HISTORY */}
        {currentTab === 'history' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Dispatched & Delivered Packages</h2>
                <p className="subtitle">Archive of all packages that have exited this facility.</p>
              </div>
            </div>

            <section className="panel">
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Destination</th>
                      <th>Driver</th>
                      <th>Status</th>
                      <th>Placed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter((o) => ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'].includes(o.status))
                      .map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>{order.dropAddress}</td>
                          <td>Agent #{order.deliveryAgentId || 'N/A'}</td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>{formatShortDate(order.createdAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
    </div>
  )
}
