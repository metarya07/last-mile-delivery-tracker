import { useState } from 'react'
import { userApi } from '../../api/userApi'

export function AvailabilityToggle({ initialAvailable = true, onToggle }) {
  const [available, setAvailable] = useState(initialAvailable)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleToggle = async () => {
    const nextState = !available
    setBusy(true)
    setError('')
    try {
      const updated = await userApi.updateAvailability(nextState)
      setAvailable(updated.available)
      if (onToggle) onToggle(updated.available)
    } catch (err) {
      setError(err.message || 'Failed to update availability')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="availability-widget">
      <div className="status-indicator">
        <span className={`dot ${available ? 'dot-online' : 'dot-offline'}`} />
        <span className="status-text">
          {available ? 'Ready for Assignments (Online)' : 'Unavailable (Offline)'}
        </span>
      </div>
      <button
        type="button"
        className={`btn-toggle ${available ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={busy}
      >
        {busy ? 'Updatingâ€¦' : available ? 'Go Offline' : 'Go Online'}
      </button>
      {error && <span className="toggle-error">{error}</span>}
    </div>
  )
}
