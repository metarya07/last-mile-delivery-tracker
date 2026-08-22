import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AvailabilityToggle } from '../components/agent/AvailabilityToggle'
import { ActiveDeliveryCard } from '../components/agent/ActiveDeliveryCard'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconCheck,
  IconAlert,
  IconUser,
  IconRefresh,
  IconMenu,
} from '../components/common/Icons'
import { formatCurrency, formatShortDate } from '../utils/formatters'

export function DeliveryPartnerPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'assigned' | 'active' | 'history' | 'profile'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [orders, setOrders] = useState([])
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
        const orderList = await orderApi.getMyOrders()
        if (isMounted) {
          setOrders(orderList || [])
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

  // Filtered list for "Assigned Deliveries" tab
  const filteredAssignedOrders = useMemo(() => {
    return orders.filter((order) => {
      let matchBucket = true
      if (filterBucket === 'OUT_FOR_DELIVERY') matchBucket = order.status === 'OUT_FOR_DELIVERY'
      else if (filterBucket === 'PENDING') matchBucket = order.status === 'PLACED' || order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT' || order.status === 'RESCHEDULED'
      else if (filterBucket === 'DELIVERED') matchBucket = order.status === 'DELIVERED'
      else if (filterBucket === 'FAILED') matchBucket = order.status === 'FAILED'

      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        order.id?.toString().includes(query) ||
        order.pickupAddress?.toLowerCase().includes(query) ||
        order.dropAddress?.toLowerCase().includes(query) ||
        order.pickupZone?.toLowerCase().includes(query) ||
        order.dropZone?.toLowerCase().includes(query)

      return matchBucket && matchQuery
    })
  }, [orders, filterBucket, searchQuery])

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setMobileNavOpen(false)
  }

  return (
    <div className="shell agent-shell">
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <IconMenu size={22} />
        </button>
        <div className="mobile-topbar-brand">
          <IconTruck size={20} className="brand-icon" />
          <span>Driver Terminal</span>
        </div>
        <button
          type="button"
          className="mobile-user-btn"
          onClick={() => switchTab('profile')}
          aria-label="Profile"
        >
          <IconUser size={18} />
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Driver Sidebar Navigation */}
      <aside className={`portal-sidebar agent-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="aside-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconTruck size={22} className="brand-icon" />
            <div>
              <p className="eyebrow">DELIVERY PARTNER</p>
              <h2>Driver Terminal</h2>
            </div>
          </div>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">PARTNER OPERATIONS</span>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => switchTab('dashboard')}
            >
              <IconTruck size={16} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'active' ? 'active' : ''}`}
              onClick={() => switchTab('active')}
            >
              <IconClock size={16} />
              <span>Active Run {activeOrder ? `(#${activeOrder.id})` : ''}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'assigned' ? 'active' : ''}`}
              onClick={() => switchTab('assigned')}
            >
              <IconPackage size={16} />
              <span>Assigned Runs ({orders.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'history' ? 'active' : ''}`}
              onClick={() => switchTab('history')}
            >
              <IconCheck size={16} />
              <span>Delivery History ({completedOrders.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => switchTab('profile')}
            >
              <IconUser size={16} />
              <span>Profile & Duty Status</span>
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <AvailabilityToggle
            initialAvailable={user?.available ?? true}
            onToggle={() => setRefreshIndex((prev) => prev + 1)}
          />

          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="user-role-pill">DELIVERY AGENT</span>
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
            <span className="role-tag">DELIVERY AGENT</span>
            <h1>Field Dispatch Console</h1>
          </div>
          <div className="header-actions">
            <AvailabilityToggle
              initialAvailable={user?.available ?? true}
              onToggle={() => setRefreshIndex((prev) => prev + 1)}
            />
            <button type="button" className="btn-secondary" onClick={logout}>
              Sign Out
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            <IconAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: DRIVER DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Operations Summary</h2>
                <p className="subtitle">Real-time status of your assigned delivery package runs.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh Queue'}</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <section className="metrics-grid">
              <MetricCard label="Out for Delivery" value={outForDeliveryOrders.length} />
              <MetricCard label="Pending Pickup / Transit" value={pendingOrders.length} />
              <MetricCard label="Completed Deliveries" value={completedOrders.length} />
              <MetricCard label="Failed Attempts" value={failedOrders.length} />
            </section>

            {/* Active Delivery Spotlight */}
            <section style={{ marginBottom: '24px' }}>
              <ActiveDeliveryCard
                order={activeOrder}
                onUpdateStatus={(o) => setStatusModalOrder(o)}
                onViewDetails={(id) => setSelectedOrderId(id)}
              />
            </section>

            {/* Assigned Orders Quick Table */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">ASSIGNED RUNS</p>
                  <h2>Package Queue ({orders.length})</h2>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentTab('assigned')}
                >
                  View Full List
                </button>
              </div>

              {loading ? (
                <p className="loading-state">Loading assigned runs...</p>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No deliveries currently assigned to your account.</p>
                  <small>Keep your duty status set to <strong>Online</strong> so central dispatch can assign packages to you.</small>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup &rarr; Drop</th>
                        <th>Status</th>
                        <th>Type & Payment</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 6).map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>#{order.id}</strong>
                          </td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address" title={order.dropAddress}>
                                Drop: {order.dropAddress}
                              </span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <span className="badge-meta">
                              {order.orderType} - {order.paymentType} {order.paymentType === 'COD' ? `(${formatCurrency(order.finalCharge)})` : ''}
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

        {/* TAB 2: ACTIVE DELIVERY FOCUSED VIEW */}
        {currentTab === 'active' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Active Run Execution</h2>
                <p className="subtitle">Focused navigation and milestone updating for your current package.</p>
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
                    <p className="eyebrow">DELIVERY PROTOCOLS</p>
                    <h2>Driver Instructions & Checklist</h2>
                  </div>
                </div>
                <div className="driver-checklist">
                  <div className="checklist-item">
                    <span className="check-number">1</span>
                    <div>
                      <strong>Verify Recipient Identity</strong>
                      <p>Ensure customer name matches Order #{activeOrder.id} records at the delivery destination.</p>
                    </div>
                  </div>
                  {activeOrder.paymentType === 'COD' && (
                    <div className="checklist-item alert-cod-border">
                      <span className="check-number" style={{ background: '#b45309' }}>2</span>
                      <div>
                        <strong>Collect Cash on Delivery ({formatCurrency(activeOrder.finalCharge)})</strong>
                        <p>Receive cash payment in full before handing over the parcel. Hand over customer receipt.</p>
                      </div>
                    </div>
                  )}
                  <div className="checklist-item">
                    <span className="check-number">3</span>
                    <div>
                      <strong>Update Status Milestone</strong>
                      <p>Mark as <strong>DELIVERED</strong> upon handover, or log <strong>FAILED</strong> with reason if customer is unreachable.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSIGNED DELIVERIES QUEUE */}
        {currentTab === 'assigned' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Assigned Deliveries Queue</h2>
                <p className="subtitle">All active, pending, and completed package dispatches assigned to you.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {/* Filter Buttons & Search */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order # or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="filter-button-group">
                <button
                  type="button"
                  className={`filter-btn ${filterBucket === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('ALL')}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterBucket === 'OUT_FOR_DELIVERY' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('OUT_FOR_DELIVERY')}
                >
                  Out For Delivery ({outForDeliveryOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterBucket === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('PENDING')}
                >
                  Pending ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterBucket === 'DELIVERED' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('DELIVERED')}
                >
                  Delivered ({completedOrders.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterBucket === 'FAILED' ? 'active' : ''}`}
                  onClick={() => setFilterBucket('FAILED')}
                >
                  Failed ({failedOrders.length})
                </button>
              </div>
            </div>

            {/* Assigned Orders Table */}
            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading assigned deliveries...</p>
              ) : filteredAssignedOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No assigned packages match the selected criteria.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup & Drop Routes</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignedOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>#{order.id}</strong>
                          </td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address" title={order.dropAddress}>
                                Drop: {order.dropAddress}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-meta">
                              {order.paymentType} {order.paymentType === 'COD' ? `(${formatCurrency(order.finalCharge)})` : ''}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <span className="time-text">
                              {formatShortDate(order.createdAt)}
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
                                Advance Status
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
                <h2>Delivery History Archive</h2>
                <p className="subtitle">Audit logs of all completed and unfulfilled delivery runs.</p>
              </div>
            </div>

            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">FULFILLED RUNS</p>
                  <h2>Delivered Packages ({completedOrders.length})</h2>
                </div>
              </div>

              {completedOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No fulfilled deliveries recorded yet.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Route</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span>{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-meta">{order.paymentType} ({formatCurrency(order.finalCharge)})</span>
                          </td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              Audit Record
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

        {/* TAB 5: PROFILE & DUTY STATUS */}
        {currentTab === 'profile' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Agent Profile</h2>
                <p className="subtitle">Driver credentials, assignment availability, and account security.</p>
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
                  <span className="user-role-pill">DELIVERY AGENT</span>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="profile-field">
                  <span className="field-label">Agent ID</span>
                  <span className="field-value">#{user?.id}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Full Name</span>
                  <span className="field-value">{user?.name}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Email Address</span>
                  <span className="field-value">{user?.email}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Phone Number</span>
                  <span className="field-value">{user?.phone || 'Not registered'}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Current Duty State</span>
                  <span className="field-value">{user?.available ? 'Online (Ready)' : 'Offline (Paused)'}</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Total Assigned</span>
                  <span className="field-value">{orders.length} packages</span>
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
