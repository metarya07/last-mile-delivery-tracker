import { useEffect, useState } from 'react'
import './App.css'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const request = async (path, options = {}, token) => {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired.' : 'Request failed.')
  return response.status === 204 ? null : response.json()
}

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('lmd-session') || 'null'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const logout = () => { localStorage.removeItem('lmd-session'); setSession(null); setOrders([]) }
  const load = async () => { if (!session) return; try { const [nextOrders, nextSummary] = await Promise.all([request('/api/orders', {}, session.token), request('/api/dashboard', {}, session.token)]); setOrders(nextOrders); setSummary(nextSummary) } catch (e) { setError(e.message); if (e.message.includes('expired')) logout() } }
  useEffect(() => { load() }, [session])
  const login = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const next = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem('lmd-session', JSON.stringify(next)); setSession(next) } catch (e) { setError('Sign in failed. Check your credentials.') } finally { setBusy(false) } }
  if (!session) return <main className="login"><section><p className="eyebrow">LAST MILE DELIVERY TRACKER</p><h1>Every delivery, visible.</h1><p className="intro">A focused operations desk for customers, agents, and administrators.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <p className="error">{error}</p>}<button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></section></main>
  return <main className="shell"><aside><p className="eyebrow">LAST MILE</p><h2>Delivery desk</h2><nav><a className="active">Overview</a><a>Orders</a><a>Tracking</a>{session.role === 'ADMIN' && <><a>Users</a><a>Zones & rates</a></>}{session.role === 'DELIVERY_AGENT' && <a>Assigned deliveries</a>}</nav></aside><section className="workspace"><header><div><p className="eyebrow">{session.role.replace('_', ' ')}</p><h1>Good to see you, {session.name}.</h1></div><button onClick={logout}>Sign out</button></header>{error && <p className="error">{error}</p>}<section className="metrics"><Metric label="Total orders" value={summary.total ?? 0}/><Metric label="In transit" value={summary.IN_TRANSIT ?? 0}/><Metric label="Delivered" value={summary.DELIVERED ?? 0}/><Metric label="Failed" value={summary.FAILED ?? 0}/></section><section className="panel"><div className="heading"><div><p className="eyebrow">LIVE DATA</p><h2>Orders</h2></div><button onClick={load}>Refresh</button></div>{orders.length ? <div className="list">{orders.map(order => <article key={order.id}><div><b>Order #{order.id}</b><span>{order.pickupZone} to {order.dropZone}</span></div><span>{order.orderType} · {order.paymentType}</span><strong className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</strong><span>{order.finalCharge}</span></article>)}</div> : <p className="empty">No orders are available for this account yet.</p>}</section></section></main>
}
function Metric({ label, value }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article> }
