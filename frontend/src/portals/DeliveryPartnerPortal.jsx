import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AvailabilityToggle } from '../components/agent/AvailabilityToggle'
import { ActiveDeliveryCard } from '../components/agent/ActiveDeliveryCard'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'

export function DeliveryPartnerPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'assigned' | 'active' | 'history' | 'profile'

  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Status transition & detail modals
  const [statusModalOrder, setStatusModalOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Filters for assigned list
  const [filterBucket, setFilterBucket] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

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
          setError(err.message || 'Failed to load assigned deliveries.')
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

  // Active / Current Run: First order that is in OUT_FOR_DELIVERY, IN_TRANSIT, or PICKED_UP or PLACED (not DELIVERED or FAILED)
  const activeOrder = useMemo(() => {
    return (
      orders.find((o) => o.status === 'OUT_FOR_DELIVERY') ||
      orders.find((o) => o.status === 'IN_TRANSIT') ||
      orders.find((o) => o.status === 'PICKED_UP') ||
      orders.find((o) => o.status === 'RESCHEDULED') ||
      orders.find((o) => o.status === 'PLACED') ||
      null
    )
  }, [orders])

  // Bucket categorization
  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === 'PLACED' ||
        o.status === 'PICKED_UP' ||
        o.status === 'IN_TRANSIT' ||
        o.status === 'RESCHEDULED'
    )
  }, [orders])

  const outForDeliveryOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'OUT_FOR_DELIVERY')
  }, [orders])

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'DELIVERED')
  }, [orders])

  const failedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'FAILED')
  }, [orders])

  // Filtered assigned deliveries list
  const filteredAssignedOrders = useMemo(() => {
    return orders.filter((o) => {
      let matchBucket = true
      if (filterBucket === 'PENDING') {
        matchBucket =
          o.status === 'PLACED' ||
          o.status === 'PICKED_UP' ||
          o.status === 'IN_TRANSIT' ||
          o.status === 'RESCHEDULED'
      } else if (filterBucket === 'ACTIVE') {
        matchBucket = o.status === 'OUT_FOR_DELIVERY'
      } else if (filterBucket === 'COMPLETED') {
        matchBucket = o.status === 'DELIVERED'
      } else if (filterBucket === 'FAILED') {
        matchBucket = o.status === 'FAILED'
      }

      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        o.id?.toString().includes(query) ||
        o.dropAddress?.toLowerCase().includes(query) ||
        o.pickupAddress?.toLowerCase().includes(query) ||
        o.dropZone?.toLowerCase().includes(query)

      return matchBucket && matchQuery
    })
  }, [orders, filterBucket, searchQuery])

  // History list (Completed and Failed)
  const historyOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'DELIVERED' || o.status === 'FAILED'
    )
  }, [orders])

  return (
    <div className="shell agent-shell">
      {/* Delivery Partner Sidebar Navigation */}
      <aside className="portal-sidebar agent-sidebar">
        <div className="aside-brand">
          <p className="eyebrow">OPERATIONAL DESK</p>
          <h2>Driver Terminal</h2>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">DISPATCH ROUTING</span>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'active' ? 'active' : ''}`}
              onClick={() => setCurrentTab('active')}
            >
              Active Delivery {activeOrder ? `(#${activeOrder.id})` : ''}
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'assigned' ? 'active' : ''}`}
              onClick={() => setCurrentTab('assigned')}
            >
              Assigned Deliveries ({orders.length})
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentTab('history')}
            >
              Delivery History ({historyOrders.length})
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentTab('profile')}
            >
              Profile & Availability
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="user-role-pill">DELIVERY PARTNER</span>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="role-tag">DELIVERY PARTNER PORTAL</span>
            <h1>Delivery Agent: {user?.name}</h1>
          </div>
          <div className="header-actions">
            <AvailabilityToggle />
            <button type="button" className="btn-secondary" onClick={logout}>
              Sign Out
            </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {/* TAB 1: OPERATIONAL DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Operations Dashboard</h2>
                <p className="subtitle">Real-time status of your assigned packages and field deliveries.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshingâ€¦' : 'Refresh Queue'}
              </button>
            </div>

            {/* Operational Buckets Metrics */}
            <section className="metrics-grid">
              <MetricCard label="Total Assigned" value={summary.total ?? orders.length} />
              <MetricCard label="Out for Delivery" value={outForDeliveryOrders.length} />
              <MetricCard label="Pending Pickups / Transit" value={pendingOrders.length} />
              <MetricCard label="Delivered" value={completedOrders.length} />
              <MetricCard label="Failed Attempts" value={failedOrders.length} />
            </section>

            {/* Current Active Run Spotlight */}
            <section style={{ marginBottom: '24px' }}>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>CURRENT RUN FOCUS</p>
              <ActiveDeliveryCard
                order={activeOrder}
                onUpdateStatus={(o) => setStatusModalOrder(o)}
                onViewDetails={(id) => setSelectedOrderId(id)}
              />
            </section>

            {/* Quick Assigned Deliveries Table */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">ASSIGNED RUNS</p>
                  <h2>Delivery Work Queue</h2>
                </div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setCurrentTab('assigned')}
                >
                  View All Deliveries &rarr;
                </button>
              </div>

              {loading ? (
                <p className="loading-state">Loading assigned runsâ€¦</p>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No delivery orders assigned to you yet.</p>
                  <small>Ensure your status is set to <strong>Online</strong> so the dispatcher can allocate shipments.</small>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup &rarr; Drop</th>
                        <th>Drop Address</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 6).map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                            </div>
                          </td>
                          <td>
                            <span className="route-address" title={order.dropAddress}>
                              {order.dropAddress}
                            </span>
                          </td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <span className="badge-meta">
                              {order.paymentType} {order.paymentType === 'COD' ? `(â‚¹${order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'})` : ''}
                            </span>
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
          </div>
        )}

        {/* TAB 2: ACTIVE DELIVERY VIEW */}
        {currentTab === 'active' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Active Run Execution</h2>
                <p className="subtitle">Execute the current delivery and transition milestone checkpoints.</p>
              </div>
            </div>

            <ActiveDeliveryCard
              order={activeOrder}
              onUpdateStatus={(o) => setStatusModalOrder(o)}
              onViewDetails={(id) => setSelectedOrderId(id)}
            />

            {activeOrder && (
              <div className="panel" style={{ marginTop: '20px' }}>
                <div className="heading">
                  <div>
                    <p className="eyebrow">DELIVERY STEP GUIDE</p>
                    <h2>Allowed Lifecycle Transitions</h2>
                  </div>
                </div>
                <div className="transition-guide-steps">
                  <div className={`guide-step ${activeOrder.status === 'PLACED' ? 'current' : 'done'}`}>
                    <span className="step-num">1</span>
                    <div>
                      <strong>PLACED</strong>
                      <p>Pick up parcel at warehouse / origin.</p>
                    </div>
                  </div>
                  <div className={`guide-step ${activeOrder.status === 'PICKED_UP' ? 'current' : activeOrder.status === 'PLACED' ? 'pending' : 'done'}`}>
                    <span className="step-num">2</span>
                    <div>
                      <strong>PICKED_UP &rarr; IN_TRANSIT</strong>
                      <p>Depart towards the recipient delivery area.</p>
                    </div>
                  </div>
                  <div className={`guide-step ${activeOrder.status === 'OUT_FOR_DELIVERY' ? 'current' : activeOrder.status === 'DELIVERED' ? 'done' : 'pending'}`}>
                    <span className="step-num">3</span>
                    <div>
                      <strong>OUT_FOR_DELIVERY</strong>
                      <p>At customer doorstep for dropoff & collection.</p>
                    </div>
                  </div>
                  <div className={`guide-step ${activeOrder.status === 'DELIVERED' ? 'current' : 'pending'}`}>
                    <span className="step-num">4</span>
                    <div>
                      <strong>DELIVERED</strong>
                      <p>Delivery verified and marked as complete.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSIGNED DELIVERIES */}
        {currentTab === 'assigned' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Assigned Deliveries</h2>
                <p className="subtitle">All orders assigned to your route roster.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshingâ€¦' : 'Refresh'}
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order # or addressâ€¦"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="filter-pill-group">
                <button
                  type="button"
                  className={`pill-btn ${filterBucket === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('ALL')}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn ${filterBucket === 'ACTIVE' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('ACTIVE')}
                >
                  Out For Delivery ({outForDeliveryOrders.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn ${filterBucket === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('PENDING')}
                >
                  Pending ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn ${filterBucket === 'COMPLETED' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('COMPLETED')}
                >
                  Delivered ({completedOrders.length})
                </button>
                <button
                  type="button"
                  className={`pill-btn ${filterBucket === 'FAILED' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('FAILED')}
                >
                  Failed ({failedOrders.length})
                </button>
              </div>
            </div>

            {/* Assigned Orders Table */}
            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading assigned deliveriesâ€¦</p>
              ) : filteredAssignedOrders.length === 0 ? (
                <p className="empty-state">No deliveries matching filter.</p>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup Address</th>
                        <th>Drop Address</th>
                        <th>Status</th>
                        <th>Payment & Charge</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignedOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
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
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <span className="badge-meta">
                              {order.paymentType} {order.paymentType === 'COD' ? `(â‚¹${order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'})` : ''}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => setStatusModalOrder(order)}
                                disabled={order.status === 'DELIVERED'}
                              >
                                Update
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
          </div>
        )}

        {/* TAB 4: DELIVERY HISTORY */}
        {currentTab === 'history' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery History</h2>
                <p className="subtitle">Log of your fulfilled and unfulfilled delivery runs.</p>
              </div>
            </div>

            <section className="panel">
              {historyOrders.length === 0 ? (
                <p className="empty-state">No historical delivery runs completed yet.</p>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Destination</th>
                        <th>Outcome Status</th>
                        <th>Payment Mode</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td><StatusBadge status={order.status} /></td>
                          <td><span className="badge-meta">{order.paymentType}</span></td>
                          <td>
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              View History & Attempts
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

        {/* TAB 5: PROFILE & AVAILABILITY */}
        {currentTab === 'profile' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Driver Profile & Roster Status</h2>
                <p className="subtitle">Manage online availability and driver shift status.</p>
              </div>
            </div>

            <div className="panel profile-panel">
              <div className="profile-header">
                <div className="avatar-circle">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h3>{user?.name}</h3>
                  <p className="user-email">{user?.email}</p>
                  <span className="user-role-pill">DELIVERY PARTNER ACCOUNT</span>
                </div>
              </div>

              <div style={{ margin: '20px 0' }}>
                <h4>Duty & Dispatch Availability</h4>
                <p style={{ fontSize: '13px', color: '#627773', marginBottom: '10px' }}>
                  When online, system dispatchers can assign new parcel delivery batches to your terminal.
                </p>
                <AvailabilityToggle />
              </div>

              <div className="profile-details-grid">
                <div className="profile-field">
                  <span className="field-label">Agent ID</span>
                  <span className="field-value">#{user?.id}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Total Assigned Deliveries</span>
                  <span className="field-value">{orders.length} runs</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Successfully Delivered</span>
                  <span className="field-value">{completedOrders.length} runs</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Failed Deliveries</span>
                  <span className="field-value">{failedOrders.length} runs</span>
                </div>
              </div>

              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForgotModal(true)}
                >
                  Change / Reset Password
                </button>
                <button type="button" className="btn-logout" onClick={logout}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={user?.email || ''}
      />
    </div>
  )
}
