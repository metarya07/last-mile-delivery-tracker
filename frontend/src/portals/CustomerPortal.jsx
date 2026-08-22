import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { CreateOrderModal } from '../components/customer/CreateOrderModal'
import { CreateOrderView } from '../components/customer/CreateOrderView'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import { TrackingTimeline } from '../components/tracking/TrackingTimeline'
import { DeliveryAttemptsList } from '../components/tracking/DeliveryAttemptsList'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'
import { deliveryPartnerApplicationApi } from '../api/deliveryPartnerApplicationApi'

export function CustomerPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'orders' | 'create' | 'tracking' | 'profile' | 'become-partner'

  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Partner application state
  const [partnerApp, setPartnerApp] = useState(null)
  const [partnerAppError, setPartnerAppError] = useState('')
  const [partnerAppSuccess, setPartnerAppSuccess] = useState('')
  const [reapplyMode, setReapplyMode] = useState(false)

  // Partner application form fields
  const [appVehicleType, setAppVehicleType] = useState('MOTORCYCLE')
  const [appVehicleNumber, setAppVehicleNumber] = useState('')
  const [appDrivingLicense, setAppDrivingLicense] = useState('')
  const [appPreferredArea, setAppPreferredArea] = useState('North Zone')
  const [appSubmitting, setAppSubmitting] = useState(false)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Filters in My Orders tab
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Tracking tab specific state
  const [trackingSearchId, setTrackingSearchId] = useState('')
  const [trackingSelectedOrder, setTrackingSelectedOrder] = useState(null)
  const [trackingHistoryList, setTrackingHistoryList] = useState([])
  const [trackingAttemptsList, setTrackingAttemptsList] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')

  // Fetch orders, summary, and partner application
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        const [orderList, summaryData, appData] = await Promise.all([
          orderApi.getMyOrders(),
          dashboardApi.getSummary().catch(() => ({})),
          deliveryPartnerApplicationApi.getMyApplication().catch(() => null),
        ])
        if (isMounted) {
          setOrders(orderList || [])
          setSummary(summaryData || {})
          setPartnerApp(appData || null)
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load customer data.')
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
    setCurrentTab('orders')
    setSelectedOrderId(newOrder.id)
  }

  const handleSubmitPartnerApp = async (e) => {
    e.preventDefault()
    setAppSubmitting(true)
    setPartnerAppError('')
    setPartnerAppSuccess('')

    try {
      const created = await deliveryPartnerApplicationApi.submitApplication({
        vehicleType: appVehicleType,
        vehicleNumber: appVehicleNumber.trim() || undefined,
        drivingLicense: appDrivingLicense.trim(),
        preferredArea: appPreferredArea.trim() || undefined,
      })
      setPartnerApp(created)
      setReapplyMode(false)
      setPartnerAppSuccess('Application submitted successfully! Our dispatch team is reviewing your details.')
      setRefreshIndex((prev) => prev + 1)
    } catch (err) {
      setPartnerAppError(err.message || 'Failed to submit delivery partner application.')
    } finally {
      setAppSubmitting(false)
    }
  }

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        o.id?.toString().includes(query) ||
        o.pickupAddress?.toLowerCase().includes(query) ||
        o.dropAddress?.toLowerCase().includes(query) ||
        o.pickupZone?.toLowerCase().includes(query) ||
        o.dropZone?.toLowerCase().includes(query)
      return matchStatus && matchQuery
    })
  }, [orders, statusFilter, searchQuery])

  // Direct tracking lookup
  const performTrackingLookup = async (idToLook) => {
    const id = Number(idToLook)
    if (!id || isNaN(id)) {
      setTrackingError('Please enter a valid numeric Order ID.')
      return
    }
    setTrackingLoading(true)
    setTrackingError('')
    try {
      const [orderData, history, attempts] = await Promise.all([
        orderApi.getOrderById(id),
        orderApi.getTrackingHistory(id).catch(() => []),
        orderApi.getDeliveryAttempts(id).catch(() => []),
      ])
      setTrackingSelectedOrder(orderData)
      setTrackingHistoryList(history || [])
      setTrackingAttemptsList(attempts || [])
    } catch (err) {
      setTrackingSelectedOrder(null)
      setTrackingHistoryList([])
      setTrackingAttemptsList([])
      setTrackingError(err.message || `Unable to find tracking records for Order #${id}.`)
    } finally {
      setTrackingLoading(false)
    }
  }

  const handleTrackTabOpen = (orderId) => {
    setCurrentTab('tracking')
    if (orderId) {
      setTrackingSearchId(orderId.toString())
      performTrackingLookup(orderId)
    }
  }

  return (
    <div className="shell customer-shell">
      {/* Customer Sidebar Navigation */}
      <aside className="portal-sidebar customer-sidebar">
        <div className="aside-brand">
          <p className="eyebrow">CUSTOMER PORTAL</p>
          <h2>LastMile Dispatch</h2>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">CUSTOMER MENU</span>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'orders' ? 'active' : ''}`}
              onClick={() => setCurrentTab('orders')}
            >
              My Orders ({orders.length})
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'create' ? 'active' : ''}`}
              onClick={() => setCurrentTab('create')}
            >
              + Create Order
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setCurrentTab('tracking')}
            >
              Order Tracking
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentTab('profile')}
            >
              Profile & Account
            </button>
            <button
              type="button"
              className={`nav-link-btn nav-partner-highlight ${currentTab === 'become-partner' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTab('become-partner')
                setPartnerAppError('')
                setPartnerAppSuccess('')
              }}
            >
              ðŸ¤ Become a Delivery Partner {partnerApp?.status === 'PENDING' ? '(Pending)' : partnerApp?.status === 'APPROVED' ? '(Approved)' : ''}
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="user-role-pill">CUSTOMER</span>
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
            <span className="role-tag">CUSTOMER PORTAL</span>
            <h1>Welcome, {user?.name}.</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateModalOpen(true)}
            >
              + Book Delivery
            </button>
            <button type="button" className="btn-secondary" onClick={logout}>
              Sign Out
            </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Customer Dashboard</h2>
                <p className="subtitle">Track your delivery lifecycle, live shipments, and dispatch records.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshingâ€¦' : 'Refresh Data'}
              </button>
            </div>

            {/* Metrics */}
            <section className="metrics-grid">
              <MetricCard label="Total Orders" value={summary.total ?? orders.length} />
              <MetricCard label="In Transit" value={summary.IN_TRANSIT ?? 0} />
              <MetricCard label="Out for Delivery" value={summary.OUT_FOR_DELIVERY ?? 0} />
              <MetricCard label="Delivered" value={summary.DELIVERED ?? 0} />
            </section>

            {/* Quick Actions / Recent Orders Highlights */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">RECENT DISPATCHES</p>
                  <h2>Latest Shipments</h2>
                </div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setCurrentTab('orders')}
                >
                  View All Orders &rarr;
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
                    onClick={() => setCurrentTab('create')}
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
                        <th>Route</th>
                        <th>Type & Payment</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address" title={order.dropAddress}>To: {order.dropAddress}</span>
                            </div>
                          </td>
                          <td><span className="badge-meta">{order.orderType} Â· {order.paymentType}</span></td>
                          <td><strong>â‚¹{order.finalCharge != null ? Number(order.finalCharge).toFixed(2) : '0.00'}</strong></td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleTrackTabOpen(order.id)}
                              >
                                Live Track
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

        {/* TAB 2: MY ORDERS */}
        {currentTab === 'orders' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>My Orders</h2>
                <p className="subtitle">Comprehensive history of all your placed delivery orders.</p>
              </div>
              <div className="toolbar-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  + Book New Delivery
                </button>
                <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                  {loading ? 'Refreshingâ€¦' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order #, zone, or addressâ€¦"
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
                <option value="RESCHEDULED">Rescheduled</option>
              </select>
            </div>

            {/* Orders Table */}
            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading your shipmentsâ€¦</p>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders matched your criteria.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Route (Pickup &rarr; Drop)</th>
                        <th>Dimensions & Weight</th>
                        <th>Type & Payment</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address" title={order.dropAddress}>To: {order.dropAddress}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-meta">
                              {order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : 'N/A'}
                            </span>
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
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleTrackTabOpen(order.id)}
                              >
                                Track
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

        {/* TAB 3: CREATE ORDER */}
        {currentTab === 'create' && (
          <div className="dashboard-content">
            <CreateOrderView onOrderCreated={handleOrderCreated} />
          </div>
        )}

        {/* TAB 4: ORDER TRACKING */}
        {currentTab === 'tracking' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Order Tracking Desk</h2>
                <p className="subtitle">Real-time milestones, carrier transition audit, and delivery attempt logs.</p>
              </div>
            </div>

            {/* Tracking Search Input Card */}
            <div className="panel tracking-search-panel">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  performTrackingLookup(trackingSearchId)
                }}
                className="tracking-search-form"
              >
                <label>
                  Enter Order ID to Track:
                  <div className="search-bar-row">
                    <input
                      type="number"
                      placeholder="e.g. 7"
                      value={trackingSearchId}
                      onChange={(e) => setTrackingSearchId(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary" disabled={trackingLoading}>
                      {trackingLoading ? 'Searchingâ€¦' : 'Track Order'}
                    </button>
                  </div>
                </label>
              </form>

              {/* Quick Picker from Recent Orders */}
              {orders.length > 0 && (
                <div className="quick-track-pills">
                  <span>Quick Select Your Recent Orders:</span>
                  <div className="pills-row">
                    {orders.slice(0, 6).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`pill-btn ${trackingSelectedOrder?.id === o.id ? 'active' : ''}`}
                        onClick={() => {
                          setTrackingSearchId(o.id.toString())
                          performTrackingLookup(o.id)
                        }}
                      >
                        #{o.id} ({o.status})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {trackingError && <div className="alert alert-error">{trackingError}</div>}

            {/* Tracking Results View */}
            {trackingSelectedOrder && (
              <div className="panel tracking-result-panel">
                <div className="order-summary-strip">
                  <div>
                    <span className="label">Order Status</span>
                    <div style={{ marginTop: '4px' }}>
                      <StatusBadge status={trackingSelectedOrder.status} />
                    </div>
                  </div>
                  <div>
                    <span className="label">Tracking Order</span>
                    <strong style={{ fontSize: '18px' }}>#{trackingSelectedOrder.id}</strong>
                  </div>
                  <div className="summary-charge">
                    <span className="label">Charge</span>
                    <strong>â‚¹{trackingSelectedOrder.finalCharge != null ? Number(trackingSelectedOrder.finalCharge).toFixed(2) : '0.00'}</strong>
                  </div>
                </div>

                <div className="order-details-grid">
                  <div className="detail-card">
                    <h4>Route & Shipment</h4>
                    <div className="route-block">
                      <div className="route-stop">
                        <span className="route-dot pickup-dot" />
                        <div>
                          <small>Pickup Zone ({trackingSelectedOrder.pickupZone})</small>
                          <p>{trackingSelectedOrder.pickupAddress}</p>
                        </div>
                      </div>
                      <div className="route-stop">
                        <span className="route-dot drop-dot" />
                        <div>
                          <small>Drop Zone ({trackingSelectedOrder.dropZone})</small>
                          <p>{trackingSelectedOrder.dropAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4>Order Information</h4>
                    <div className="specs-table">
                      <div className="spec-row">
                        <span>Chargeable Weight:</span>
                        <strong>{trackingSelectedOrder.chargeableWeightKg != null ? `${trackingSelectedOrder.chargeableWeightKg} kg` : 'N/A'}</strong>
                      </div>
                      <div className="spec-row">
                        <span>Order Type:</span>
                        <span>{trackingSelectedOrder.orderType}</span>
                      </div>
                      <div className="spec-row">
                        <span>Payment Type:</span>
                        <span>{trackingSelectedOrder.paymentType}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <TrackingTimeline history={trackingHistoryList} />
                </div>

                <div style={{ marginTop: '24px' }}>
                  <DeliveryAttemptsList attempts={trackingAttemptsList} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE & ACCOUNT */}
        {currentTab === 'profile' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Customer Profile</h2>
                <p className="subtitle">Account information and security settings.</p>
              </div>
            </div>

            <div className="panel profile-panel">
              <div className="profile-header">
                <div className="avatar-circle">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3>{user?.name}</h3>
                  <p className="user-email">{user?.email}</p>
                  <span className="user-role-pill">CUSTOMER ACCOUNT</span>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="profile-field">
                  <span className="field-label">User ID</span>
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
                  <span className="field-label">Account Role</span>
                  <span className="field-value">Registered Customer</span>
                </div>
                <div className="profile-field">
                  <span className="field-label">Total Shipments</span>
                  <span className="field-value">{orders.length} orders placed</span>
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

        {/* TAB 6: BECOME A DELIVERY PARTNER */}
        {currentTab === 'become-partner' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Become a Delivery Partner</h2>
                <p className="subtitle">Join our logistics fleet to accept delivery runs and earn per dispatch.</p>
              </div>
            </div>

            {partnerAppError && <div className="alert alert-error">{partnerAppError}</div>}
            {partnerAppSuccess && <div className="alert alert-success">{partnerAppSuccess}</div>}

            {/* STATE 1: PENDING APPLICATION */}
            {partnerApp && partnerApp.status === 'PENDING' && (
              <div className="panel partner-status-panel">
                <div className="partner-status-header">
                  <span className="status-badge status-placed">APPLICATION PENDING REVIEW</span>
                  <h3>Your Application is Under Administrator Review</h3>
                  <p className="status-note">
                    We have received your driver credentials. System dispatchers review new partner applications promptly.
                  </p>
                </div>

                <div className="application-summary-grid">
                  <div className="summary-field">
                    <span className="field-label">Application ID</span>
                    <span className="field-value">#{partnerApp.id}</span>
                  </div>
                  <div className="summary-field">
                    <span className="field-label">Submitted On</span>
                    <span className="field-value">
                      {partnerApp.createdAt ? new Date(partnerApp.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="summary-field">
                    <span className="field-label">Vehicle Type</span>
                    <span className="field-value">{partnerApp.vehicleType}</span>
                  </div>
                  <div className="summary-field">
                    <span className="field-label">Vehicle Number</span>
                    <span className="field-value">{partnerApp.vehicleNumber || 'N/A'}</span>
                  </div>
                  <div className="summary-field">
                    <span className="field-label">Driving License</span>
                    <span className="field-value">{partnerApp.drivingLicense}</span>
                  </div>
                  <div className="summary-field">
                    <span className="field-label">Preferred Operating Area</span>
                    <span className="field-value">{partnerApp.preferredArea || 'All Zones'}</span>
                  </div>
                </div>

                <div className="application-locked-notice">
                  <p>ðŸ”’ Active applications are locked to prevent duplicate submissions. You will see your updated status here.</p>
                </div>
              </div>
            )}

            {/* STATE 2: APPROVED APPLICATION */}
            {partnerApp && partnerApp.status === 'APPROVED' && (
              <div className="panel partner-status-panel partner-approved-panel">
                <div className="partner-status-header">
                  <span className="status-badge status-delivered">APPLICATION APPROVED</span>
                  <h3>Congratulations! You are an Approved Delivery Partner</h3>
                  <p className="status-note">
                    Your application has been accepted by dispatch administration. Your account role is promoted to <strong>DELIVERY_AGENT</strong>.
                  </p>
                </div>

                <div className="approved-action-box">
                  <p>To enter your dedicated <strong>Driver Terminal</strong> and begin managing assigned shipments, please sign in with a new session token.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={logout}
                    style={{ marginTop: '12px' }}
                  >
                    Sign Out & Launch Driver Terminal
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: REJECTED APPLICATION (NOT in reapply mode) */}
            {partnerApp && partnerApp.status === 'REJECTED' && !reapplyMode && (
              <div className="panel partner-status-panel partner-rejected-panel">
                <div className="partner-status-header">
                  <span className="status-badge status-failed">APPLICATION REJECTED</span>
                  <h3>Application Not Approved</h3>
                  <p className="status-note">
                    Your previous delivery partner application was reviewed and could not be approved at this time.
                  </p>
                </div>

                {partnerApp.rejectionReason && (
                  <div className="rejection-reason-box">
                    <strong>Admin Review Notes / Rejection Reason:</strong>
                    <p>{partnerApp.rejectionReason}</p>
                    <small>
                      Reviewed by {partnerApp.reviewedByName || 'Administrator'} on {partnerApp.reviewedAt ? new Date(partnerApp.reviewedAt).toLocaleString() : 'N/A'}
                    </small>
                  </div>
                )}

                <div className="reapply-cta-box" style={{ marginTop: '20px' }}>
                  <p>You may correct your vehicle or license information and submit a new application for review.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setReapplyMode(true)
                      setAppVehicleType(partnerApp.vehicleType || 'MOTORCYCLE')
                      setAppVehicleNumber(partnerApp.vehicleNumber || '')
                      setAppDrivingLicense(partnerApp.drivingLicense || '')
                      setAppPreferredArea(partnerApp.preferredArea || 'North Zone')
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    ðŸ”„ Submit Corrected Application
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: NEW APPLICATION FORM (When no app exists OR in reapply mode) */}
            {(!partnerApp || (partnerApp.status === 'REJECTED' && reapplyMode)) && (
              <div className="panel partner-apply-form-panel">
                <div className="heading">
                  <div>
                    <p className="eyebrow">DRIVER ROSTER REGISTRATION</p>
                    <h2>{reapplyMode ? 'Resubmit Partner Application' : 'Delivery Partner Application'}</h2>
                  </div>
                  {reapplyMode && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setReapplyMode(false)}
                    >
                      Cancel Resubmission
                    </button>
                  )}
                </div>

                <p className="form-intro">
                  Provide your vehicle and license details below. Upon approval by an administrator, your customer account will be upgraded with access to the Delivery Partner Portal.
                </p>

                <form onSubmit={handleSubmitPartnerApp} className="modal-form">
                  <div className="form-grid-2">
                    <label>
                      Vehicle Type
                      <select
                        value={appVehicleType}
                        onChange={(e) => setAppVehicleType(e.target.value)}
                        required
                      >
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="SCOOTER">Scooter / Moped</option>
                        <option value="ELECTRIC_BIKE">Electric Bike (E-Bike)</option>
                        <option value="BICYCLE">Bicycle</option>
                        <option value="VAN">Delivery Van</option>
                        <option value="CAR">Car / Hatchback</option>
                      </select>
                    </label>

                    <label>
                      Vehicle Registration Number
                      <input
                        type="text"
                        placeholder="e.g. MH-12-AB-1234"
                        value={appVehicleNumber}
                        onChange={(e) => setAppVehicleNumber(e.target.value)}
                        maxLength={50}
                      />
                    </label>
                  </div>

                  <div className="form-grid-2">
                    <label>
                      Driving License Number *
                      <input
                        type="text"
                        placeholder="e.g. DL-1234567890123"
                        value={appDrivingLicense}
                        onChange={(e) => setAppDrivingLicense(e.target.value)}
                        maxLength={100}
                        required
                      />
                    </label>

                    <label>
                      Preferred Operating Zone / Area
                      <select
                        value={appPreferredArea}
                        onChange={(e) => setAppPreferredArea(e.target.value)}
                      >
                        <option value="North Zone">Zone 1 â€” North Zone</option>
                        <option value="South Zone">Zone 2 â€” South Zone</option>
                        <option value="East Zone">Zone 3 â€” East Zone</option>
                        <option value="West Zone">Zone 4 â€” West Zone</option>
                        <option value="Central Zone">Zone 5 â€” Central Zone</option>
                        <option value="All Zones">All City Zones</option>
                      </select>
                    </label>
                  </div>

                  <div className="partner-terms-box">
                    <p>
                      ðŸ“‹ By submitting this application, you confirm that your driving license and vehicle documents are valid. Administrators will verify details before activation.
                    </p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      disabled={appSubmitting}
                      className="btn-primary"
                    >
                      {appSubmitting ? 'Submitting Applicationâ€¦' : 'Submit Application for Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />

      {/* Order Details Modal */}
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
