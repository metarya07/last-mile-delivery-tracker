import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/useAuth'
import { orderApi } from '../api/orderApi'
import { userApi } from '../api/userApi'
import { dashboardApi } from '../api/dashboardApi'
import { deliveryPartnerApplicationApi } from '../api/deliveryPartnerApplicationApi'
import { MetricCard } from '../components/common/MetricCard'
import { StatusBadge } from '../components/common/StatusBadge'
import { AssignAgentModal } from '../components/admin/AssignAgentModal'
import { CreateOrderModal } from '../components/customer/CreateOrderModal'
import { StatusTransitionModal } from '../components/agent/StatusTransitionModal'
import { OrderDetailModal } from '../components/tracking/OrderDetailModal'
import { TrackingTimeline } from '../components/tracking/TrackingTimeline'
import { DeliveryAttemptsList } from '../components/tracking/DeliveryAttemptsList'
import { Modal } from '../components/common/Modal'
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconUser,
  IconRefresh,
  IconMenu,
  IconSearch,
  IconCheck,
  IconPartner,
  IconPlus,
} from '../components/common/Icons'
import { formatCurrency, formatShortDate } from '../utils/formatters'

export function DispatcherPortal() {
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
          setError(err.message || 'Failed to load dispatch console data.')
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
      setAppActionSuccess(`Application #${appId} approved! Applicant ${updatedApp.applicantName} is now active.`)
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

  const unassignedOrders = useMemo(() => {
    return orders.filter(
      (o) => !o.deliveryAgentId && o.status !== 'DELIVERED' && o.status !== 'FAILED'
    )
  }, [orders])

  const uniqueZones = useMemo(() => {
    const set = new Set()
    orders.forEach((o) => {
      if (o.pickupZone) set.add(o.pickupZone)
      if (o.dropZone) set.add(o.dropZone)
    })
    return Array.from(set)
  }, [orders])

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
        app.preferredArea?.toLowerCase().includes(query)

      return matchStatus && matchQuery
    })
  }, [applications, appStatusFilter, appSearchQuery])

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
    <div className="shell portal-shell dispatcher-shell">
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
          <span>Dispatcher Desk</span>
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
            <IconTruck size={22} className="brand-icon" />
            <div>
              <p className="eyebrow">OPERATIONS</p>
              <h2>Dispatcher Desk</h2>
            </div>
          </div>
        </div>

        <nav>
          <div className="nav-group">
            <span className="nav-group-label">DISPATCH COMMAND</span>
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
              <span>Assignment Queue {unassignedOrders.length > 0 ? `(${unassignedOrders.length})` : ''}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'agents' ? 'active' : ''}`}
              onClick={() => switchTab('agents')}
            >
              <IconUser size={16} />
              <span>Fleet Agents ({agents.length})</span>
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
              <span>Partner Reviews {pendingApplications.length > 0 ? `(${pendingApplications.length} pending)` : `(${applications.length})`}</span>
            </button>
            <button
              type="button"
              className={`nav-link-btn ${currentTab === 'tracking' ? 'active' : ''}`}
              onClick={() => switchTab('tracking')}
            >
              <IconSearch size={16} />
              <span>Live Tracking & History</span>
            </button>
          </div>
        </nav>

        <div className="aside-footer">
          <div className="user-profile-card">
            <p className="user-name">{user?.name}</p>
            <p className="user-email">{user?.email}</p>
            <span className="badge-agent-assigned">DISPATCHER</span>
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
            <span className="role-tag">OPERATIONS MANAGER</span>
            <h1>Fleet Dispatch Console</h1>
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
                label="ACTIVE SHIPMENTS"
                value={summary.total ?? orders.length}
                trend="All active system orders"
              />
              <MetricCard
                label="PENDING ALLOCATION"
                value={unassignedOrders.length}
                trend="Awaiting driver allocation"
              />
              <MetricCard
                label="OUT FOR DELIVERY"
                value={orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length}
                trend="Currently on last-mile run"
              />
              <MetricCard
                label="ONLINE DRIVERS"
                value={agents.filter((a) => a.available).length}
                trend="Available for dispatch"
              />
            </section>

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
                  <p>No orders currently active.</p>
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
                          <td><strong>#{order.id}</strong></td>
                          <td><span>User #{order.customerId}</span></td>
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
                              <span className="route-address" title={order.dropAddress}>{order.dropAddress}</span>
                            </div>
                          </td>
                          <td><strong>{formatCurrency(order.finalCharge)}</strong></td>
                          <td><StatusBadge status={order.status} /></td>
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

        {/* TAB 2: ALL ORDERS */}
        {currentTab === 'orders' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Central Dispatch Registry</h2>
                <p className="subtitle">Search, filter, and allocate shipments across all operating zones.</p>
              </div>
            </div>

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
                <option value="ALL">All Drivers</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                <option value="ASSIGNED">Assigned Only</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id.toString()}>
                    Agent #{ag.id} - {ag.name}
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
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <section className="panel">
              {filteredOrders.length === 0 ? (
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
                        <th>Charge</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td><span>User #{order.customerId}</span></td>
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
                              <span className="route-address" title={order.dropAddress}>{order.dropAddress}</span>
                            </div>
                          </td>
                          <td><strong>{formatCurrency(order.finalCharge)}</strong></td>
                          <td><StatusBadge status={order.status} /></td>
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
                                onClick={() => setStatusModalOrder(order)}
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
                <h2>Pending Driver Allocation Queue</h2>
                <p className="subtitle">Orders awaiting delivery agent assignment.</p>
              </div>
            </div>

            <section className="panel">
              {unassignedOrders.length === 0 ? (
                <div className="empty-state">
                  <IconCheck size={48} className="empty-icon" />
                  <p>All active packages have been allocated to delivery drivers!</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Route</th>
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
                              <span>{order.pickupZone} &rarr; {order.dropZone}</span>
                              <span className="route-address">{order.dropAddress}</span>
                            </div>
                          </td>
                          <td><strong>{formatCurrency(order.finalCharge)}</strong></td>
                          <td>{formatShortDate(order.createdAt)}</td>
                          <td>
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => handleAutoAssign(order.id)}
                                disabled={autoAssigningId === order.id}
                                style={{ background: '#059669', borderColor: '#059669' }}
                              >
                                Auto-Assign
                              </button>
                              <button
                                type="button"
                                className="btn-table-primary"
                                onClick={() => setAssignModalOrder(order)}
                              >
                                Manual Assign
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

        {/* TAB 4: FLEET AGENTS */}
        {currentTab === 'agents' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Fleet Delivery Agents</h2>
                <p className="subtitle">Driver directory and live availability status.</p>
              </div>
            </div>

            <section className="panel">
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Agent ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Duty Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((ag) => (
                      <tr key={ag.id}>
                        <td><strong>#{ag.id}</strong></td>
                        <td>{ag.name}</td>
                        <td>{ag.email}</td>
                        <td>{ag.phone || 'N/A'}</td>
                        <td>
                          <span className={ag.available ? 'badge-agent-assigned' : 'badge-agent-unassigned'}>
                            {ag.available ? 'Online (Ready)' : 'Offline (Paused)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 5: PARTNER APPLICATIONS */}
        {currentTab === 'applications' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Delivery Partner Applications</h2>
                <p className="subtitle">Review driver applications and approve new partner accounts.</p>
              </div>
            </div>

            {appActionSuccess && <div className="alert alert-success">{appActionSuccess}</div>}
            {appActionError && <div className="alert alert-error">{appActionError}</div>}

            <div className="filter-bar">
              <input
                type="text"
                placeholder="Search by Applicant Name, Email, Phone, Vehicle, License..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Application Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <section className="panel">
              {filteredApplications.length === 0 ? (
                <div className="empty-state">
                  <p>No driver applications found.</p>
                </div>
              ) : (
                <div className="orders-table-wrapper">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>App #</th>
                        <th>Applicant</th>
                        <th>Vehicle</th>
                        <th>License</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app) => (
                        <tr key={app.id}>
                          <td><strong>#{app.id}</strong></td>
                          <td>
                            <div>
                              <strong>{app.applicantName}</strong>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{app.applicantEmail}</p>
                            </div>
                          </td>
                          <td>{app.vehicleType} ({app.vehicleNumber || 'N/A'})</td>
                          <td><code>{app.drivingLicense}</code></td>
                          <td>
                            <span className={app.status === 'APPROVED' ? 'badge-agent-assigned' : app.status === 'PENDING' ? 'badge-agent-unassigned' : 'badge-meta'}>
                              {app.status}
                            </span>
                          </td>
                          <td>
                            {app.status === 'PENDING' && (
                              <div className="table-actions-group">
                                <button
                                  type="button"
                                  className="btn-table-primary"
                                  onClick={() => handleApproveApplication(app.id)}
                                  disabled={approveBusyId === app.id}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn-table-action"
                                  onClick={() => setRejectingApp(app)}
                                >
                                  Reject
                                </button>
                              </div>
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

        {/* TAB 6: TRACKING & HISTORY */}
        {currentTab === 'tracking' && (
          <div className="dashboard-content">
            <div className="section-toolbar">
              <div>
                <h2>Live Tracking & Timeline Lookup</h2>
                <p className="subtitle">Real-time status check and chronological transition logs.</p>
              </div>
            </div>

            <div className="panel tracking-search-panel">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  performTrackingLookup(trackingLookupId)
                }}
                className="tracking-search-form"
              >
                <label>
                  Enter Order ID to Inspect:
                  <div className="search-bar-row">
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={trackingLookupId}
                      onChange={(e) => setTrackingLookupId(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary" disabled={trackingLoading}>
                      <IconSearch size={16} />
                      <span>{trackingLoading ? 'Searching...' : 'Inspect'}</span>
                    </button>
                  </div>
                </label>
              </form>
            </div>

            {trackingError && <div className="alert alert-error">{trackingError}</div>}

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

      {/* Modals */}
      <AssignAgentModal
        isOpen={!!assignModalOrder}
        onClose={() => setAssignModalOrder(null)}
        order={assignModalOrder}
        onAssigned={handleOrderUpdated}
      />

      <StatusTransitionModal
        isOpen={!!statusModalOrder}
        onClose={() => setStatusModalOrder(null)}
        order={statusModalOrder}
        onStatusUpdated={handleOrderUpdated}
      />

      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />

      <CreateOrderModal
        isOpen={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onOrderCreated={handleOrderUpdated}
      />

      {/* Reject App Modal */}
      <Modal
        isOpen={!!rejectingApp}
        onClose={() => {
          setRejectingApp(null)
          setRejectionReason('')
        }}
        title={`Reject Partner Application #${rejectingApp?.id}`}
      >
        <form onSubmit={handleRejectApplication}>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Applicant: <strong>{rejectingApp?.applicantName}</strong> ({rejectingApp?.applicantEmail})
          </p>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Reason for Rejection:</span>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unclear license photocopy, invalid vehicle registration..."
              className="form-control"
              style={{ width: '100%', marginTop: '6px' }}
            />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setRejectingApp(null)
                setRejectionReason('')
              }}
              disabled={rejectBusy}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={rejectBusy || !rejectionReason.trim()}>
              {rejectBusy ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
