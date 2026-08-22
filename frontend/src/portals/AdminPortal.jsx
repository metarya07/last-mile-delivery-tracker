import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { userApi } from '../api/userApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AssignAgentModal } from '../components/admin/AssignAgentModal'
import { AgentListModal } from '../components/admin/AgentListModal'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import { TrackingTimeline } from '../components/tracking/TrackingTimeline'
import { DeliveryAttemptsList } from '../components/tracking/DeliveryAttemptsList'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'
import { Modal } from '../components/common/Modal'
import { deliveryPartnerApplicationApi } from '../api/deliveryPartnerApplicationApi'
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconUser,
  IconRefresh,
  IconMenu,
  IconSearch,
  IconAlert,
  IconCheck,
  IconX,
  IconPartner,
  IconPhone,
} from '../components/common/Icons'
import { formatCurrency, formatDate, formatShortDate } from '../utils/formatters'

export function AdminPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'orders' | 'assignments' | 'agents' | 'applications' | 'tracking'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [orders, setOrders] = useState([])
  const [agents, setAgents] = useState([])
  const [applications, setApplications] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Applications tab specific state
  const [appStatusFilter, setAppStatusFilter] = useState('ALL')
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [rejectingApp, setRejectingApp] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectBusy, setRejectBusy] = useState(false)
  const [approveBusyId, setApproveBusyId] = useState(null)
  const [appActionError, setAppActionError] = useState('')
  const [appActionSuccess, setAppActionSuccess] = useState('')

  // Modals state
  const [assignModalOrder, setAssignModalOrder] = useState(null)
  const [statusModalOrder, setStatusModalOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [agentListOpen, setAgentListOpen] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Filters for Orders tab
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [agentFilter, setAgentFilter] = useState('ALL') // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  const [searchQuery, setSearchQuery] = useState('')

  // Tracking tab specific state
  const [trackingSearchId, setTrackingSearchId] = useState('')
  const [trackingSelectedOrder, setTrackingSelectedOrder] = useState(null)
  const [trackingHistoryList, setTrackingHistoryList] = useState([])
  const [trackingAttemptsList, setTrackingAttemptsList] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      try {
        const [orderList, agentList, appList, summaryData] = await Promise.all([
          orderApi.getMyOrders(),
          userApi.getDeliveryAgents().catch(() => []),
          deliveryPartnerApplicationApi.getAllApplications().catch(() => []),
          dashboardApi.getSummary().catch(() => ({})),
        ])
        if (isMounted) {
          setOrders(orderList || [])
          setAgents(agentList || [])
          setApplications(appList || [])
          setSummary(summaryData || {})
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load system data.')
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

  const handleApproveApplication = async (appId) => {
    if (!window.confirm('Approve this application and promote the applicant to DELIVERY_AGENT?')) {
      return
    }
    setApproveBusyId(appId)
    setAppActionError('')
    setAppActionSuccess('')
    try {
      const updatedApp = await deliveryPartnerApplicationApi.approveApplication(appId)
      setApplications((prev) => prev.map((a) => (a.id === appId ? updatedApp : a)))
      setAppActionSuccess(`Application #${appId} approved! User ${updatedApp.applicantName} is now a DELIVERY_AGENT.`)
      setRefreshIndex((prev) => prev + 1)
    } catch (err) {
      setAppActionError(err.message || 'Failed to approve application.')
    } finally {
      setApproveBusyId(null)
    }
  }

  const handleRejectApplication = async (e) => {
    e.preventDefault()
    if (!rejectingApp || !rejectionReason.trim()) return

    setRejectBusy(true)
    setAppActionError('')
    setAppActionSuccess('')
    try {
      const updatedApp = await deliveryPartnerApplicationApi.rejectApplication(rejectingApp.id, {
        reason: rejectionReason.trim(),
      })
      setApplications((prev) => prev.map((a) => (a.id === rejectingApp.id ? updatedApp : a)))
      setAppActionSuccess(`Application #${rejectingApp.id} has been marked as REJECTED.`)
      setRejectingApp(null)
      setRejectionReason('')
      setRefreshIndex((prev) => prev + 1)
    } catch (err) {
      setAppActionError(err.message || 'Failed to reject application.')
    } finally {
      setRejectBusy(false)
    }
  }

  // Unassigned orders queue
  const unassignedOrders = useMemo(() => {
    return orders.filter(
      (o) => !o.deliveryAgentId && o.status !== 'DELIVERED' && o.status !== 'FAILED'
    )
  }, [orders])

  // Filtered orders for All Orders tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
      const matchAgent =
        agentFilter === 'ALL' ||
        (agentFilter === 'UNASSIGNED' && !o.deliveryAgentId) ||
        (agentFilter === 'ASSIGNED' && !!o.deliveryAgentId)

      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        o.id?.toString().includes(query) ||
        o.customerId?.toString().includes(query) ||
        o.deliveryAgentId?.toString().includes(query) ||
        o.dropAddress?.toLowerCase().includes(query) ||
        o.pickupAddress?.toLowerCase().includes(query)

      return matchStatus && matchAgent && matchQuery
    })
  }, [orders, statusFilter, agentFilter, searchQuery])

  // Applications helpers
  const pendingApplications = useMemo(() => {
    return applications.filter((a) => a.status === 'PENDING')
  }, [applications])

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchStatus = appStatusFilter === 'ALL' || app.status === appStatusFilter
      const query = appSearchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        app.id?.toString().includes(query) ||
        app.applicantName?.toLowerCase().includes(query) ||
        app.applicantEmail?.toLowerCase().includes(query) ||
        app.drivingLicense?.toLowerCase().includes(query) ||
        app.vehicleType?.toLowerCase().includes(query) ||
        app.vehicleNumber?.toLowerCase().includes(query) ||
        app.preferredArea?.toLowerCase().includes(query)

      return matchStatus && matchQuery
    })
  }, [applications, appStatusFilter, appSearchQuery])

  // Tracking lookup
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

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`Are you sure you want to remove user "${agentName}" (ID: ${agentId})?`)) {
      return
    }
    try {
      await userApi.deleteUser(agentId)
      setAgents((prev) => prev.filter((a) => a.id !== agentId))
      setRefreshIndex((prev) => prev + 1)
    } catch (err) {
      alert(err.message || 'Failed to remove user.')
    }
  }

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setMobileNavOpen(false)
  }

  return (
    <div className="shell admin-shell">
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
          <span>Control Center</span>
        </div>
        <button
          type="button"
          className="mobile-user-btn"
          onClick={() => setShowForgotModal(true)}
          aria-label="Security"
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

      {/* Admin Sidebar Navigation */}
      <aside className={`portal-sidebar admin-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="aside-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconTruck size={22} className="brand-icon" />
            <div>
              <p className="eyebrow">ADMINISTRATION</p>
              <h2>Control Center</h2>
            </div>
          </div>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">SYSTEM COMMAND</span>
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
              className={`nav-link-btn ${currentTab === 'orders' ? 'active' : ''}`}
              onClick={() => switchTab('orders')}
            >
              <IconPackage size={16} />
              <span>All Orders ({orders.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'assignments' ? 'active' : ''}`}
              onClick={() => switchTab('assignments')}
            >
              <IconClock size={16} />
              <span>Assignments Queue {unassignedOrders.length > 0 ? `(${unassignedOrders.length})` : ''}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'agents' ? 'active' : ''}`}
              onClick={() => switchTab('agents')}
            >
              <IconUser size={16} />
              <span>Delivery Agents ({agents.length})</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'applications' ? 'active' : ''}`}
              onClick={() => {
                switchTab('applications')
                setAppActionError('')
                setAppActionSuccess('')
              }}
            >
              <IconPartner size={16} />
              <span>Partner Applications {pendingApplications.length > 0 ? `(${pendingApplications.length} pending)` : `(${applications.length})`}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'tracking' ? 'active' : ''}`}
              onClick={() => switchTab('tracking')}
            >
              <IconSearch size={16} />
              <span>Tracking & Audit</span>
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="user-role-pill">SYSTEM ADMIN</span>
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
            <span className="role-tag">ADMIN PORTAL</span>
            <h1>Central Dispatch Console</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForgotModal(true)}
            >
              Account Security
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

        {/* TAB 1: ADMIN DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Platform Metrics Overview</h2>
                <p className="subtitle">System-wide parcel throughput, active fleet status, and fulfillment counters.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh System Data'}</span>
              </button>
            </div>

            {/* Metrics Overview */}
            <section className="metrics-grid">
              <MetricCard label="Total Orders" value={summary.total ?? orders.length} />
              <MetricCard label="In Transit" value={summary.IN_TRANSIT ?? 0} />
              <MetricCard label="Delivered" value={summary.DELIVERED ?? 0} />
              <MetricCard label="Needs Attention / Failed" value={summary.FAILED ?? 0} />
            </section>

            {/* Operations Attention Strip */}
            <div className="dashboard-quick-actions">
              {unassignedOrders.length > 0 ? (
                <div className="panel action-alert-card">
                  <div>
                    <span className="live-pulse-badge">PENDING ALLOCATION</span>
                    <h3>{unassignedOrders.length} Order(s) Awaiting Driver Assignment</h3>
                    <p>Allocate delivery partners from the queue to start parcel pickups.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setCurrentTab('assignments')}
                  >
                    Open Assignment Queue
                  </button>
                </div>
              ) : (
                <div className="panel action-ok-card">
                  <div>
                    <span className="badge-agent-assigned">ROSTER BALANCED</span>
                    <h3>All Active Orders Assigned</h3>
                    <p>All active packages have been assigned to delivery agents.</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAgentListOpen(true)}
                  >
                    View Fleet Directory
                  </button>
                </div>
              )}
            </div>

            {/* Global Orders Panel */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">RECENT ACTIVITY</p>
                  <h2>Live Package Registry</h2>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentTab('orders')}
                >
                  View All Orders ({orders.length})
                </button>
              </div>

              {loading ? (
                <p className="loading-state">Loading system-wide orders...</p>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders registered in the system yet.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Assigned Agent</th>
                        <th>Route</th>
                        <th>Charge</th>
                        <th>Status</th>
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
                            <strong>{formatCurrency(order.finalCharge)}</strong>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <div className="table-actions-group">
                              {!order.deliveryAgentId && (
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => setAssignModalOrder(order)}
                                >
                                  Assign
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

        {/* TAB 2: ALL ORDERS REGISTRY */}
        {currentTab === 'orders' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Central Orders Registry</h2>
                <p className="subtitle">Search, filter, assign, and manage all platform shipments.</p>
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

            {/* Filter Bar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Order #, Customer ID, Agent ID, or Address..."
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
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Assignments</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                <option value="ASSIGNED">Assigned Only</option>
              </select>
            </div>

            {/* Table */}
            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading system-wide orders...</p>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders match the selected search & filter criteria.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Agent</th>
                        <th>Route</th>
                        <th>Type & Payment</th>
                        <th>Charge</th>
                        <th>Status</th>
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
                            <span className="badge-meta">{order.orderType} - {order.paymentType}</span>
                          </td>
                          <td>
                            <strong>{formatCurrency(order.finalCharge)}</strong>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <div className="table-actions-group">
                              {!order.deliveryAgentId && (
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => setAssignModalOrder(order)}
                                >
                                  Assign
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

        {/* TAB 3: UNASSIGNED ORDERS QUEUE */}
        {currentTab === 'assignments' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Assignments Dispatch Queue</h2>
                <p className="subtitle">Allocate available delivery partners to incoming unassigned packages.</p>
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

            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">UNASSIGNED PACKAGES</p>
                  <h2>Ready for Agent Assignment ({unassignedOrders.length})</h2>
                </div>
              </div>

              {unassignedOrders.length === 0 ? (
                <div className="empty-state">
                  <p>All active orders have been assigned to delivery agents!</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer ID</th>
                        <th>Pickup & Drop Location</th>
                        <th>Weight & Specs</th>
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td>User #{order.customerId}</td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address">{order.pickupAddress} &rarr; {order.dropAddress}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-meta">
                              {order.chargeableWeightKg != null ? `${order.chargeableWeightKg} kg` : ''} - {order.orderType}
                            </span>
                          </td>
                          <td><strong>{formatCurrency(order.finalCharge)}</strong></td>
                          <td><StatusBadge status={order.status} /></td>
                          <td>
                            <button
                              type="button"
                              className="btn-table-primary"
                              onClick={() => setAssignModalOrder(order)}
                            >
                              Assign Driver
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

        {/* TAB 4: DELIVERY AGENTS (FLEET) */}
        {currentTab === 'agents' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Agents Fleet Directory</h2>
                <p className="subtitle">Manage delivery partner roster, check online availability, and contact info.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh Fleet'}</span>
              </button>
            </div>

            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">ACTIVE FLEET</p>
                  <h2>Available Delivery Agents ({agents.length})</h2>
                </div>
              </div>

              {agents.length === 0 ? (
                <p className="empty-state-notice">
                  No delivery agents are currently available/online in the fleet.
                </p>
              ) : (
                <div className="agent-directory-list">
                  {agents.map((agent) => (
                    <div key={agent.id} className="agent-row">
                      <div className="agent-info">
                        <span className={`dot ${agent.available ? 'dot-online' : 'dot-offline'}`} />
                        <div>
                          <strong>{agent.name}</strong>
                          <span className="agent-meta">
                            {agent.email}
                            {agent.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                                <IconPhone size={12} /> {agent.phone}
                              </span>
                            )}
                            {' '}- ID #{agent.id}
                          </span>
                        </div>
                      </div>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-danger-outline"
                          onClick={() => handleDeleteAgent(agent.id, agent.name)}
                          title="Remove user"
                        >
                          Remove Agent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 4.5: DELIVERY PARTNER APPLICATIONS */}
        {currentTab === 'applications' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Partner Applications</h2>
                <p className="subtitle">Review driver credential submissions, verify licenses, and approve role promotions.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh Applications'}</span>
              </button>
            </div>

            {appActionError && (
              <div className="alert alert-error">
                <IconAlert size={18} />
                <span>{appActionError}</span>
              </div>
            )}
            {appActionSuccess && (
              <div className="alert alert-success">
                <IconCheck size={18} />
                <span>{appActionSuccess}</span>
              </div>
            )}

            {/* Applications Metric Row */}
            <section className="metrics-grid">
              <MetricCard label="Total Applications" value={applications.length} />
              <MetricCard label="Pending Review" value={pendingApplications.length} />
              <MetricCard label="Approved Partners" value={applications.filter((a) => a.status === 'APPROVED').length} />
              <MetricCard label="Rejected" value={applications.filter((a) => a.status === 'REJECTED').length} />
            </section>

            {/* Filter bar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Applicant Name, Email, License, or Vehicle..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Application States</option>
                <option value="PENDING">Pending Review Only</option>
                <option value="APPROVED">Approved Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>

            {/* Applications Registry Table */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">DRIVER APPLICANT REGISTRY</p>
                  <h2>Partner Submissions ({filteredApplications.length})</h2>
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="empty-state">
                  <p>No delivery partner applications matching filter criteria.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>App #</th>
                        <th>Applicant Details</th>
                        <th>Vehicle Type & No.</th>
                        <th>Driving License</th>
                        <th>Preferred Zone</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                        <th>Reviewer Info</th>
                        <th>Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => (
                        <tr key={app.id}>
                          <td><strong>#{app.id}</strong></td>
                          <td>
                            <div className="route-cell">
                              <strong>{app.applicantName}</strong>
                              <span className="route-address" title={app.applicantEmail}>{app.applicantEmail}</span>
                              {app.applicantPhone && (
                                <span className="time-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <IconPhone size={11} /> {app.applicantPhone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="route-cell">
                              <span className="badge-meta">{app.vehicleType}</span>
                              <span className="time-text">{app.vehicleNumber || 'No plate provided'}</span>
                            </div>
                          </td>
                          <td>
                            <strong>{app.drivingLicense}</strong>
                          </td>
                          <td>
                            <span className="badge-meta">{app.preferredArea || 'All Zones'}</span>
                          </td>
                          <td>
                            <StatusBadge status={app.status} />
                          </td>
                          <td>
                            <span className="time-text">
                              {formatShortDate(app.createdAt)}
                            </span>
                          </td>
                          <td>
                            {app.reviewedByName ? (
                              <div className="route-cell">
                                <span className="time-text">By: {app.reviewedByName}</span>
                                {app.rejectionReason && (
                                  <span className="rejection-reason-chip" title={app.rejectionReason}>
                                    Note: {app.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="time-text">Awaiting Review</span>
                            )}
                          </td>
                          <td>
                            {app.status === 'PENDING' ? (
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  style={{ background: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleApproveApplication(app.id)}
                                  disabled={approveBusyId === app.id}
                                >
                                  <IconCheck size={14} />
                                  <span>{approveBusyId === app.id ? 'Approving...' : 'Approve'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn-danger-outline"
                                  onClick={() => {
                                    setRejectingApp(app)
                                    setRejectionReason('')
                                  }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <IconX size={14} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : app.status === 'APPROVED' ? (
                              <span className="badge-agent-assigned">Promoted to Agent</span>
                            ) : (
                              <span className="badge-agent-unassigned">Rejected</span>
                            )}
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

        {/* TAB 5: TRACKING & AUDIT */}
        {currentTab === 'tracking' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Universal Tracking & Audit</h2>
                <p className="subtitle">Audit lifecycle status changes, actor fingerprints, and delivery attempts.</p>
              </div>
            </div>

            <div className="panel tracking-search-panel">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  performTrackingLookup(trackingSearchId)
                }}
                className="tracking-search-form"
              >
                <label>
                  Enter Any Order ID to Inspect:
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
                      <span>{trackingLoading ? 'Inspecting...' : 'Inspect Audit Log'}</span>
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
                    <span className="label">Order Status</span>
                    <div style={{ marginTop: '4px' }}>
                      <StatusBadge status={trackingSelectedOrder.status} />
                    </div>
                  </div>
                  <div>
                    <span className="label">Assigned Agent</span>
                    <strong>{trackingSelectedOrder.deliveryAgentId ? `Agent #${trackingSelectedOrder.deliveryAgentId}` : 'Unassigned'}</strong>
                  </div>
                  <div className="summary-charge">
                    <span className="label">Final Charge</span>
                    <strong>{formatCurrency(trackingSelectedOrder.finalCharge)}</strong>
                  </div>
                </div>

                <div className="order-details-grid">
                  <div className="detail-card">
                    <h4>Route & Customer</h4>
                    <p><strong>Customer ID:</strong> User #{trackingSelectedOrder.customerId}</p>
                    <p><strong>Pickup:</strong> {trackingSelectedOrder.pickupAddress} ({trackingSelectedOrder.pickupZone})</p>
                    <p><strong>Drop:</strong> {trackingSelectedOrder.dropAddress} ({trackingSelectedOrder.dropZone})</p>
                  </div>

                  <div className="detail-card">
                    <h4>Logistics Specs</h4>
                    <p><strong>Type:</strong> {trackingSelectedOrder.orderType} - {trackingSelectedOrder.paymentType}</p>
                    <p><strong>Billable Weight:</strong> {trackingSelectedOrder.chargeableWeightKg != null ? `${trackingSelectedOrder.chargeableWeightKg} kg` : 'N/A'}</p>
                    <p><strong>Created Date:</strong> {formatDate(trackingSelectedOrder.createdAt)}</p>
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
      </main>

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

      {/* Order Detail Modal */}
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

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={user?.email || ''}
      />

      {/* Reject Application Modal */}
      <Modal
        isOpen={!!rejectingApp}
        onClose={() => setRejectingApp(null)}
        title={rejectingApp ? `Reject Application #${rejectingApp.id}` : 'Reject Partner Application'}
        subtitle={rejectingApp ? `Applicant: ${rejectingApp.applicantName}` : 'Driver Credential Review'}
        maxWidth="500px"
      >
        {rejectingApp && (
          <form onSubmit={handleRejectApplication} className="modal-form">
            <p className="form-description">
              Please specify the reason for rejecting <strong>{rejectingApp.applicantName}</strong>&apos;s application. The applicant will see this feedback and may reapply.
            </p>

            <label>
              Rejection Reason *
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Driving license copy is unreadable / vehicle not eligible in requested zone"
                required
                autoFocus
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRejectingApp(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectBusy || !rejectionReason.trim()}
                className="btn-primary"
                style={{ background: '#b91c1c', borderColor: '#b91c1c' }}
              >
                {rejectBusy ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
