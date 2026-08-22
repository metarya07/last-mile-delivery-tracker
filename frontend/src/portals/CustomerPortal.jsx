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
import {
  IconTruck,
  IconPackage,
  IconPlus,
  IconSearch,
  IconUser,
  IconPartner,
  IconRefresh,
  IconMenu,
  IconLock,
  IconAlert,
  IconCheck,
} from '../components/common/Icons'
import { formatCurrency, formatDate, formatShortDate } from '../utils/formatters'

export function CustomerPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'orders' | 'create' | 'tracking' | 'profile' | 'become-partner'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    setMobileNavOpen(false)
    if (orderId) {
      setTrackingSearchId(orderId.toString())
      performTrackingLookup(orderId)
    }
  }

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setMobileNavOpen(false)
  }

  return (
    <div className="shell customer-shell">
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
          <span>LastMile Dispatch</span>
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

      {/* Customer Sidebar Navigation */}
      <aside className={`portal-sidebar customer-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="aside-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconTruck size={22} className="brand-icon" />
            <div>
              <p className="eyebrow">CUSTOMER PORTAL</p>
              <h2>LastMile Dispatch</h2>
            </div>
          </div>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">CUSTOMER MENU</span>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => switchTab('dashboard')}
            >
              <IconPackage size={16} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'orders' ? 'active' : ''}`}
              onClick={() => switchTab('orders')}
            >
              <IconPackage size={16} />
              <span>My Orders ({orders.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'create' ? 'active' : ''}`}
              onClick={() => switchTab('create')}
            >
              <IconPlus size={16} />
              <span>Book Delivery</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'tracking' ? 'active' : ''}`}
              onClick={() => switchTab('tracking')}
            >
              <IconSearch size={16} />
              <span>Order Tracking</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => switchTab('profile')}
            >
              <IconUser size={16} />
              <span>Profile & Account</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn nav-partner-highlight ${currentTab === 'become-partner' ? 'active' : ''}`}
              onClick={() => {
                switchTab('become-partner')
                setPartnerAppError('')
                setPartnerAppSuccess('')
              }}
            >
              <IconPartner size={16} />
              <span>Become a Partner {partnerApp?.status === 'PENDING' ? '(Pending)' : partnerApp?.status === 'APPROVED' ? '(Approved)' : ''}</span>
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
            <span className="role-tag">CUSTOMER ACCESS</span>
            <h1>Customer Operations Desk</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateModalOpen(true)}
            >
              <IconPlus size={16} />
              <span>New Shipment</span>
            </button>
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

        {/* TAB 1: CUSTOMER DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Overview</h2>
                <p className="subtitle">Track your package dispatches, transit updates, and fulfillment.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            </div>

            {/* Metrics Overview */}
            <section className="metrics-grid">
              <MetricCard label="Total Orders Placed" value={summary.total ?? orders.length} />
              <MetricCard label="In Transit" value={summary.IN_TRANSIT ?? 0} />
              <MetricCard label="Delivered Packages" value={summary.DELIVERED ?? 0} />
              <MetricCard label="Needs Attention / Failed" value={summary.FAILED ?? 0} />
            </section>

            {/* Quick Actions & Recent Orders Banner */}
            <section className="panel dispatch-alert-banner">
              <div>
                <p className="eyebrow">NEED TO SEND A PARCEL?</p>
                <h3>Book Instant Door-to-Door Delivery</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                  Select pickup and drop zones with automatic weight & volumetric fare calculation.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentTab('create')}
              >
                <IconPlus size={16} />
                <span>Open Booking Desk</span>
              </button>
            </section>

            {/* Recent Shipments Panel */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">RECENT SHIPMENTS</p>
                  <h2>Latest Dispatches</h2>
                </div>
                {orders.length > 5 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentTab('orders')}
                  >
                    View All ({orders.length})
                  </button>
                )}
              </div>

              {loading ? (
                <p className="loading-state">Loading your shipments...</p>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>You have not created any delivery orders yet.</p>
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
                      {orders.slice(0, 5).map((order) => (
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
                            <span className="badge-meta">{order.orderType} - {order.paymentType}</span>
                          </td>
                          <td>
                            <strong>{formatCurrency(order.finalCharge)}</strong>
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
                                className="btn-table-action"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleTrackTabOpen(order.id)}
                              >
                                Track
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

        {/* TAB 2: MY ORDERS LIST (WITH FILTERING) */}
        {currentTab === 'orders' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>My Orders Directory</h2>
                <p className="subtitle">Search, filter, and inspect all packages placed under your customer account.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <IconPlus size={14} />
                  <span>+ Create Order</span>
                </button>
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
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order #, zone, or address..."
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

            {/* Full Orders Table */}
            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading your shipments...</p>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders match the selected filters.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Pickup & Drop Routes</th>
                        <th>Type & Payment</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>#{order.id}</strong>
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
                            <span className="badge-meta">{order.orderType} - {order.paymentType}</span>
                          </td>
                          <td>
                            <strong>{formatCurrency(order.finalCharge)}</strong>
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
                                className="btn-table-action"
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleTrackTabOpen(order.id)}
                              >
                                Live Track
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

        {/* TAB 3: CREATE ORDER DESK */}
        {currentTab === 'create' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Create Delivery Order</h2>
                <p className="subtitle">Specify route locations, parcel dimensions, and billing options.</p>
              </div>
            </div>
            <CreateOrderView onOrderCreated={handleOrderCreated} />
          </div>
        )}

        {/* TAB 4: ORDER TRACKING & AUDIT */}
        {currentTab === 'tracking' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Order Tracking & Delivery History</h2>
                <p className="subtitle">Real-time status milestones and recorded delivery attempt logs.</p>
              </div>
            </div>

            {/* Tracking Search Card */}
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
                      placeholder="e.g. 1"
                      value={trackingSearchId}
                      onChange={(e) => setTrackingSearchId(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary" disabled={trackingLoading}>
                      <IconSearch size={16} />
                      <span>{trackingLoading ? 'Searching...' : 'Track Order'}</span>
                    </button>
                  </div>
                </label>
              </form>
            </div>

            {trackingError && (
              <div className="alert alert-error">
                <IconAlert size={18} />
                <span>{trackingError}</span>
              </div>
            )}

            {trackingSelectedOrder && (
              <div className="panel tracking-result-panel">
                <div className="order-summary-strip">
                  <div>
                    <span className="label">Order #{trackingSelectedOrder.id} Status</span>
                    <div style={{ marginTop: '4px' }}>
                      <StatusBadge status={trackingSelectedOrder.status} />
                    </div>
                  </div>
                  <div className="summary-charge">
                    <span className="label">Final Charge</span>
                    <strong>{formatCurrency(trackingSelectedOrder.finalCharge)}</strong>
                  </div>
                </div>

                <div className="order-details-grid">
                  <div className="detail-card">
                    <h4>Route Information</h4>
                    <p><strong>Pickup:</strong> {trackingSelectedOrder.pickupAddress} ({trackingSelectedOrder.pickupZone})</p>
                    <p><strong>Drop:</strong> {trackingSelectedOrder.dropAddress} ({trackingSelectedOrder.dropZone})</p>
                  </div>
                  <div className="detail-card">
                    <h4>Logistics Specs</h4>
                    <p><strong>Type:</strong> {trackingSelectedOrder.orderType} - {trackingSelectedOrder.paymentType}</p>
                    <p><strong>Billable Weight:</strong> {trackingSelectedOrder.chargeableWeightKg != null ? `${trackingSelectedOrder.chargeableWeightKg} kg` : 'N/A'}</p>
                    <p><strong>Created:</strong> {formatDate(trackingSelectedOrder.createdAt)}</p>
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

            {partnerAppError && (
              <div className="alert alert-error">
                <IconAlert size={18} />
                <span>{partnerAppError}</span>
              </div>
            )}
            {partnerAppSuccess && (
              <div className="alert alert-success">
                <IconCheck size={18} />
                <span>{partnerAppSuccess}</span>
              </div>
            )}

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
                    <span className="field-value">{formatDate(partnerApp.createdAt)}</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconLock size={16} />
                    <p>Active applications are locked to prevent duplicate submissions. You will see your updated status here.</p>
                  </div>
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
                      Reviewed by {partnerApp.reviewedByName || 'Administrator'} on {formatDate(partnerApp.reviewedAt)}
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
                    Submit Corrected Application
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
                        <option value="North Zone">Zone 1 - North Zone</option>
                        <option value="South Zone">Zone 2 - South Zone</option>
                        <option value="East Zone">Zone 3 - East Zone</option>
                        <option value="West Zone">Zone 4 - West Zone</option>
                        <option value="Central Zone">Zone 5 - Central Zone</option>
                        <option value="All Zones">All City Zones</option>
                      </select>
                    </label>
                  </div>

                  <div className="partner-terms-box">
                    <p>
                      By submitting this application, you confirm that your driving license and vehicle documents are valid. Administrators will verify details before activation.
                    </p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      disabled={appSubmitting}
                      className="btn-primary"
                    >
                      {appSubmitting ? 'Submitting Application...' : 'Submit Application for Review'}
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
