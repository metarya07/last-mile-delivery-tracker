import { useState } from 'react'
import { authApi } from '../../api/authApi'
import { Modal } from '../common/Modal'

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [step, setStep] = useState(1) // 1: Request OTP, 2: Verify OTP, 3: Reset Password, 4: Success
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleClose = () => {
    setStep(1)
    setEmail(initialEmail)
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccessMsg('')
    onClose()
  }

  // Step 1: Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await authApi.forgotPassword(email.trim())
      setSuccessMsg(`OTP sent to ${email}. Please check your inbox (and SMS if registered).`)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setBusy(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP must be a 6-digit number')
      return
    }
    setBusy(true)
    setError('')
    try {
      await authApi.verifyOtp(email.trim(), otp.trim())
      setSuccessMsg('OTP verified successfully. Now choose a new password.')
      setStep(3)
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP')
    } finally {
      setBusy(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError('Password must be between 8 and 72 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError('')
    try {
      await authApi.resetPassword(email.trim(), otp.trim(), newPassword)
      setSuccessMsg('Your password has been reset successfully. You can now sign in.')
      setStep(4)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Password"
      subtitle="Account Recovery"
      maxWidth="460px"
    >
      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="modal-form">
          <p className="form-description">
            Enter your registered email address. We will send a 6-digit verification OTP to your email.
          </p>
          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Sending OTPâ€¦' : 'Send Verification OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="modal-form">
          <p className="form-description">
            Enter the 6-digit OTP sent to <strong>{email}</strong> (valid for 10 minutes).
          </p>
          <label>
            6-Digit OTP
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              required
              autoFocus
              className="otp-input"
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => { setError(''); setStep(1) }}>
              Back
            </button>
            <button type="submit" disabled={busy || otp.length !== 6} className="btn-primary">
              {busy ? 'Verifyingâ€¦' : 'Verify OTP'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="modal-form">
          <p className="form-description">
            Create a secure new password (at least 8 characters).
          </p>
          <label>
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              maxLength={72}
              required
              autoFocus
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => { setError(''); setStep(2) }}>
              Back
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Savingâ€¦' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="modal-success-state">
          <p>Your password has been updated. Please sign in with your new credentials.</p>
          <button type="button" className="btn-primary" onClick={handleClose} style={{ width: '100%' }}>
            Proceed to Sign In
          </button>
        </div>
      )}
    </Modal>
  )
}
