import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'

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
      setSuccess('Account created successfully! Welcome.')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <section>
        <p className="eyebrow">LAST MILE DELIVERY TRACKER</p>
        <h1>Every delivery, visible.</h1>
        <p className="intro">A focused operations desk for customers, agents, and administrators.</p>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); setSuccess('') }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setError(''); setSuccess('') }}
            >
              Register Customer
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
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

              <div className="form-secondary-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Signing inâ€¦' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <label>
                Full Name
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Jane Doe"
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label>
                Password (min 8 characters)
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
                Phone Number (optional)
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  maxLength={20}
                />
              </label>

              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Creating accountâ€¦' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </section>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={loginEmail}
      />
    </main>
  )
}
