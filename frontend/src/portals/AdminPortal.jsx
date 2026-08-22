import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { userApi } from '../api/userApi'
import { dashboardApi } from '../api/dashboardApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AssignAgentModal } from '../components/admin/AssignAgentModal'
import { AgentListModal } from '../components/admin/AgentListModal'
import { RateAndZoneManager } from '../components/admin/RateAndZoneManager'
import { CreateOrderModal } from '../components/customer/CreateOrderModal'
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
  IconPartner,
  IconPhone,
  IconPlus,
} from '../components/common/Icons'
import { formatCurrency, formatShortDate } from '../utils/formatters'

export function AdminPortal() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard') // 'dashboard' | 'orders' | 'assignments' | 'rates' | 'agents' | 'applications' | 'tracking'
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
  const [createOrderOpen, setCreateOrderOpen] = useState(false)
  const [autoAssigningId, setAutoAssigningId] = useState(null)

  // Filters in All Orders tab
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [agentFilter, setAgentFilter] = useState('ALL')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Tracking lookup tab state
  const [trackingLookupId, setTrackingLookupId] = useState('')
  const [trackingSelectedOrder, setTrackingSelectedOrder] = useState(null)
  const [trackingHistoryList, setTrackingHistoryList] = useState([])
  const [trackingAttemptsList, setTrackingAttemptsList] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')

  // Load all platform data
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [ordersData, agentsData, appsData, summaryData] = await Promise.all([
          orderApi.getMyOrders(),
          userApi.getDeliveryAgents().catch(() => []),
          deliveryPartnerApplicationApi.getAllApplications().catch(() => []),
          dashboardApi.getSummary().catch(() => ({})),
        ])

        if (isMounted) {
          setOrders(ordersData || [])
          setAgents(agentsData || [])
          setApplications(appsData || [])
          setSummary(summaryData || {})
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load administrative overview.')
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

  const handleAutoAssign = async (orderId) => {
    setAutoAssigningId(orderId)
    try {
      const updated = await orderApi.autoAssign(orderId)
      handleOrderUpdated(updated)
    } catch (err) {
      alert(err.message || 'Auto-assignment failed.')
    } finally {
      setAutoAssigningId(null)
    }
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

  // All unique zones for filter
  const uniqueZones = useMemo(() => {
    const set = new Set()
    orders.forEach((o) => {
      if (o.pickupZone) set.add(o.pickupZone)
      if (o.dropZone) set.add(o.dropZone)
    })
    return Array.from(set)
  }, [orders])

  // Filtered orders for All Orders tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter
      const matchAgent =
        agentFilter === 'ALL' ||
        (agentFilter === 'UNASSIGNED' && !o.deliveryAgentId) ||
        (agentFilter === 'ASSIGNED' && !!o.deliveryAgentId) ||
        (o.deliveryAgentId?.toString() === agentFilter)

      const matchZone =
        zoneFilter === 'ALL' ||
        o.pickupZone === zoneFilter ||
        o.dropZone === zoneFilter

      const query = searchQuery.trim().toLowerCase()
      const matchQuery =
        !query ||
        o.id?.toString().includes(query) ||
        o.customerId?.toString().includes(query) ||
        o.deliveryAgentId?.toString().includes(query) ||
        o.dropAddress?.toLowerCase().includes(query) ||
        o.pickupAddress?.toLowerCase().includes(query)

      return matchStatus && matchAgent && matchZone && matchQuery
    })
  }, [orders, statusFilter, agentFilter, zoneFilter, searchQuery])

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

  const switchTab = (tab) => {
    setCurrentTab(tab)
    setMobileNavOpen(false)
  }

  return (
    <div className="portal-shell">
      {/* Mobile Topbar */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
        >
          <IconMenu size={22} />
        </button>
        <div className="mobile-topbar-title">
          <IconTruck size={20} />
          <span>Admin Control Center</span>
        </div>
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
              className={`nav-link-btn ${currentTab === 'rates' ? 'active' : ''}`}
              onClick={() => switchTab('rates')}
            >
              <IconPartner size={16} />
              <span>Rate Cards & Zones</span>
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
            <span className="badge-agent-assigned">ADMIN</span>
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
            <span className="role-tag">PLATFORM ADMIN</span>
            <h1>Operations Console</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateOrderOpen(true)}
            >
              <IconPlus size={15} />
              <span>+ Create Order (On Behalf)</span>
            </button>
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

        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div className="dashboard-content">
            <section className="metrics-grid">
              <MetricCard
                label="TOTAL SHIPMENTS"
                value={summary.totalOrders ?? orders.length}
                trend="All active & historical orders"
              />
              <MetricCard
                label="PENDING ASSIGNMENTS"
                value={unassignedOrders.length}
                trend="Awaiting agent allocation"
              />
              <MetricCard
                label="IN TRANSIT / ACTIVE"
                value={
                  summary.inTransitOrders ??
                  orders.filter((o) => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(o.status)).length
                }
                trend="Currently out with drivers"
              />
              <MetricCard
                label="DELIVERED / COMPLETED"
                value={
                  summary.deliveredOrders ??
                  orders.filter((o) => o.status === 'DELIVERED').length
                }
                trend="Successfully delivered"
              />
            </section>

            {/* Quick Actions Panel */}
            <section className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="eyebrow">QUICK DISPATCH</p>
                <h3 style={{ margin: 0 }}>Create New Order on Behalf of a Customer</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                  Calculate volumetric rates and generate orders for registered customer IDs.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setCreateOrderOpen(true)}>
                <IconPlus size={16} />
                <span>Open Booking Console</span>
              </button>
            </section>

            {/* Live Operations Feed */}
            <section className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">LIVE DISPATCH FEED</p>
                  <h2>Recent Platform Activity</h2>
                </div>
                <button type="button" className="btn-secondary" onClick={() => switchTab('orders')}>
                  View All ({orders.length})
                </button>
              </div>

              {loading ? (
                <p className="loading-state">Loading real-time orders...</p>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders currently placed on the platform.</p>
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
                                <>
                                  <button
                                    type="button"
                                    className="btn-table-primary"
                                    onClick={() => handleAutoAssign(order.id)}
                                    disabled={autoAssigningId === order.id}
                                    style={{ background: '#059669', borderColor: '#059669' }}
                                  >
                                    {autoAssigningId === order.id ? 'Auto...' : 'Auto-Assign'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table-primary"
                                    onClick={() => setAssignModalOrder(order)}
                                  >
                                    Assign
                                  </button>
                                </>
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
                <p className="subtitle">Search, filter, assign, and override any platform shipment.</p>
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
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id.toString()}>
                    Agent: {ag.name} (#{ag.id})
                  </option>
                ))}
              </select>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Zones</option>
                {uniqueZones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
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
                                <>
                                  <button
                                    type="button"
                                    className="btn-table-primary"
                                    onClick={() => handleAutoAssign(order.id)}
                                    disabled={autoAssigningId === order.id}
                                    style={{ background: '#059669', borderColor: '#059669' }}
                                    title="Detect nearest available agent"
                                  >
                                    Auto
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table-primary"
                                    onClick={() => setAssignModalOrder(order)}
                                  >
                                    Assign
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="btn-table-action"
                                onClick={() => setStatusModalOrder(order)}
                                title="Override or advance status"
                              >
                                Override
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

        {/* TAB 3: ASSIGNMENTS QUEUE */}
        {currentTab === 'assignments' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Pending Dispatch & Assignment Queue</h2>
                <p className="subtitle">Orders awaiting delivery partner allocation or automated assignment.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            <section className="panel">
              {loading ? (
                <p className="loading-state">Checking unassigned runs...</p>
              ) : unassignedOrders.length === 0 ? (
                <div className="empty-state">
                  <IconCheck size={48} className="empty-icon" />
                  <p>Assignment queue is clear! All active orders have been assigned to delivery agents.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Route</th>
                        <th>Chargeable Weight</th>
                        <th>Charge</th>
                        <th>Placed At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td><span>User #{order.customerId}</span></td>
                          <td>
                            <div className="route-cell">
                              <span className="route-zones">{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address" title={order.dropAddress}>{order.dropAddress}</span>
                            </div>
                          </td>
                          <td><span>{order.chargeableWeightKg} kg</span></td>
                          <td><strong>{formatCurrency(order.finalCharge)}</strong></td>
                          <td><span className="time-text">{formatShortDate(order.createdAt)}</span></td>
                          <td>
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleAutoAssign(order.id)}
                                disabled={autoAssigningId === order.id}
                                style={{ background: '#059669', borderColor: '#059669' }}
                              >
                                {autoAssigningId === order.id ? 'Auto...' : 'Auto-Assign'}
                              </button>
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => setAssignModalOrder(order)}
                              >
                                Manual Assign
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

        {/* TAB 4: RATE CARDS & ZONES MANAGEMENT */}
        {currentTab === 'rates' && (
          <div className="dashboard-content">
            <RateAndZoneManager />
          </div>
        )}

        {/* TAB 5: DELIVERY AGENTS FLEET */}
        {currentTab === 'agents' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Agents Fleet</h2>
                <p className="subtitle">Manage partner accounts, duty status, and fleet assignments.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAgentListOpen(true)}
              >
                <IconPhone size={14} />
                <span>Contact Directory</span>
              </button>
            </div>

            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading agents fleet...</p>
              ) : agents.length === 0 ? (
                <div className="empty-state">
                  <p>No delivery agents found in system registry.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Agent ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Duty Status</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.id}>
                          <td><strong>#{agent.id}</strong></td>
                          <td><strong>{agent.name}</strong></td>
                          <td><span>{agent.email}</span></td>
                          <td><span>{agent.phone || 'N/A'}</span></td>
                          <td>
                            <span className={agent.available ? 'badge-agent-assigned' : 'badge-meta'}>
                              {agent.available ? '● Online (Ready)' : '○ Offline'}
                            </span>
                          </td>
                          <td><span className="badge-meta">{agent.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 6: PARTNER APPLICATIONS */}
        {currentTab === 'applications' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Partner Applications</h2>
                <p className="subtitle">Review customer applications to become verified delivery partners.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
                <IconRefresh size={14} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {appActionError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                <IconAlert size={16} />
                <span>{appActionError}</span>
              </div>
            )}
            {appActionSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                <IconCheck size={16} />
                <span>{appActionSuccess}</span>
              </div>
            )}

            {/* Filter Bar */}
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Applicant Name, Email, Vehicle #, or License..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Application Statuses ({applications.length})</option>
                <option value="PENDING">Pending Review ({pendingApplications.length})</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <section className="panel">
              {loading ? (
                <p className="loading-state">Loading partner applications...</p>
              ) : filteredApplications.length === 0 ? (
                <div className="empty-state">
                  <p>No partner applications match the selected criteria.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>App #</th>
                        <th>Applicant</th>
                        <th>Vehicle</th>
                        <th>License #</th>
                        <th>Preferred Area</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Review Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => (
                        <tr key={app.id}>
                          <td><strong>#{app.id}</strong></td>
                          <td>
                            <div>
                              <strong>{app.applicantName}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {app.applicantEmail}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span className="badge-meta">{app.vehicleType}</span>
                              <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                                {app.vehicleNumber}
                              </div>
                            </div>
                          </td>
                          <td><code>{app.drivingLicense}</code></td>
                          <td><span>{app.preferredArea}</span></td>
                          <td><span className="time-text">{formatShortDate(app.createdAt)}</span></td>
                          <td><StatusBadge status={app.status} /></td>
                          <td>
                            {app.status === 'PENDING' ? (
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => handleApproveApplication(app.id)}
                                  disabled={approveBusyId === app.id}
                                >
                                  {approveBusyId === app.id ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-table-action"
                                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                                  onClick={() => {
                                    setRejectingApp(app)
                                    setRejectionReason('')
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : app.status === 'APPROVED' ? (
                              <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
                                Verified Partner
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 600 }}>
                                Rejected: {app.rejectionReason || 'No reason specified'}
                              </span>
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

        {/* TAB 7: TRACKING & AUDIT */}
        {currentTab === 'tracking' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Central Tracking & Audit Trail</h2>
                <p className="subtitle">Audit state transitions, milestone actors, and delivery attempts.</p>
              </div>
            </div>

            <section className="panel" style={{ marginBottom: '20px' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  performTrackingLookup(trackingLookupId)
                }}
                className="tracking-search-bar"
              >
                <input
                  type="number"
                  placeholder="Enter Order ID to inspect (e.g. 101)..."
                  value={trackingLookupId}
                  onChange={(e) => setTrackingLookupId(e.target.value)}
                  className="search-input"
                  required
                />
                <button type="submit" className="btn-primary" disabled={trackingLoading}>
                  <IconSearch size={15} />
                  <span>{trackingLoading ? 'Searching...' : 'Audit Order'}</span>
                </button>
              </form>

              {trackingError && <div className="alert alert-error" style={{ marginTop: '12px' }}>{trackingError}</div>}
            </section>

            {trackingSelectedOrder && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="panel">
                  <div className="heading">
                    <div>
                      <p className="eyebrow">ORDER SUMMARY</p>
                      <h3>Order #{trackingSelectedOrder.id} Details</h3>
                    </div>
                    <StatusBadge status={trackingSelectedOrder.status} />
                  </div>
                  <div className="info-grid">
                    <div>
                      <span className="label">Pickup Location</span>
                      <span className="value">{trackingSelectedOrder.pickupAddress} ({trackingSelectedOrder.pickupZone})</span>
                    </div>
                    <div>
                      <span className="label">Delivery Destination</span>
                      <span className="value">{trackingSelectedOrder.dropAddress} ({trackingSelectedOrder.dropZone})</span>
                    </div>
                    <div>
                      <span className="label">Total Charge</span>
                      <span className="value">{formatCurrency(trackingSelectedOrder.finalCharge)}</span>
                    </div>
                    <div>
                      <span className="label">Assigned Agent</span>
                      <span className="value">
                        {trackingSelectedOrder.deliveryAgentId ? `Agent #${trackingSelectedOrder.deliveryAgentId}` : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="heading">
                    <div>
                      <p className="eyebrow">AUDIT TRAIL</p>
                      <h3>State Transition History</h3>
                    </div>
                  </div>
                  <TrackingTimeline trackingHistory={trackingHistoryList} />
                </div>

                <div className="panel">
                  <div className="heading">
                    <div>
                      <p className="eyebrow">ATTEMPTS</p>
                      <h3>Delivery Attempts Recorded</h3>
                    </div>
                  </div>
                  <DeliveryAttemptsList attempts={trackingAttemptsList} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      <CreateOrderModal
        isOpen={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onOrderCreated={(newOrder) => {
          handleOrderUpdated(newOrder)
          setRefreshIndex((r) => r + 1)
        }}
        isAdmin={true}
      />

      <AssignAgentModal
        isOpen={!!assignModalOrder}
        onClose={() => setAssignModalOrder(null)}
        order={assignModalOrder}
        agents={agents}
        onAssigned={(updated) => {
          handleOrderUpdated(updated)
          setAssignModalOrder(null)
        }}
      />

      <StatusTransitionModal
        isOpen={!!statusModalOrder}
        onClose={() => setStatusModalOrder(null)}
        order={statusModalOrder}
        onStatusUpdated={(updated) => {
          handleOrderUpdated(updated)
          setStatusModalOrder(null)
        }}
      />

      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />

      <AgentListModal
        isOpen={agentListOpen}
        onClose={() => setAgentListOpen(false)}
        agents={agents}
      />

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={user?.email}
      />

      {/* Reject Application Modal */}
      <Modal
        isOpen={!!rejectingApp}
        onClose={() => {
          setRejectingApp(null)
          setRejectionReason('')
        }}
        title="Reject Delivery Partner Application"
        subtitle={`Application #${rejectingApp?.id} - ${rejectingApp?.applicantName}`}
        maxWidth="500px"
      >
        <form onSubmit={handleRejectApplication} className="modal-form">
          <label>
            Reason for Rejection *
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid driving license document, vehicle details incomplete"
              required
              autoFocus
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setRejectingApp(null)
                setRejectionReason('')
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              disabled={rejectBusy || !rejectionReason.trim()}
            >
              {rejectBusy ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
