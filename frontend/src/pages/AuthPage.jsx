import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'
import { IconTruck } from '../components/common/Icons'

export function AuthPage() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPhone, setRegPhone] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotModal, setShowForgotModal] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login({ email: loginEmail.trim(), password: loginPassword })
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (regPassword.length < 8 || regPassword.length > 72) {
      setError('Password must be between 8 and 72 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
      })
      setSuccess('Account created successfully! Welcome aboard.')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-brand-icon">
            <IconTruck size={32} />
          </div>
          <p className="eyebrow" style={{ marginTop: '12px' }}>LAST MILE DELIVERY TRACKER</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>
            Every delivery, visible.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '6px' }}>
            A focused operations desk for customers, agents, and administrators.
          </p>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); setSuccess('') }}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '14px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '14px' }}>
            {success}
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="modal-form">
            <label>
              Email Address
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>

            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowForgotModal(true)}
                style={{ fontSize: '13px' }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{ width: '100%', height: '44px', fontSize: '14px' }}
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="demo-credentials-box" style={{ marginTop: '16px', padding: '12px', background: 'var(--primary-subtle)', borderRadius: '8px', border: '1px solid var(--primary-border)' }}>
              <p style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                🚀 Quick Role Preview (1-Click Sign-In)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setLoginEmail('admin@lastmile.com'); setLoginPassword('password123') }}
                  style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-border)', background: '#ffffff', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  👑 Admin
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginEmail('dispatcher@lastmile.com'); setLoginPassword('password123') }}
                  style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-border)', background: '#ffffff', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  📡 Dispatcher
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginEmail('agent@lastmile.com'); setLoginPassword('password123') }}
                  style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-border)', background: '#ffffff', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  🚚 Driver
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginEmail('warehouse@lastmile.com'); setLoginPassword('password123') }}
                  style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-border)', background: '#ffffff', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  📦 Warehouse
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginEmail('customer@lastmile.com'); setLoginPassword('password123') }}
                  style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--primary-border)', background: '#ffffff', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  👤 Customer
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="modal-form">
            <label>
              Full Name
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Jane Doe"
                maxLength={100}
                required
                autoFocus
              />
            </label>
            <label>
              Email Address
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <label>
              Phone Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
              />
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{ width: '100%', height: '44px', fontSize: '14px' }}
            >
              {busy ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-faint)' }}>
          Customer self-registration only. Delivery agents & admins are provisioned by system administrators.
        </p>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={loginEmail}
      />
    </main>
  )
}
