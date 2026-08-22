import { useState } from 'react'
import { orderApi } from '../../api/orderApi'
import { Modal } from '../common/Modal'
import { IconClock, IconAlert } from '../common/Icons'

export function RescheduleModal({ isOpen, onClose, order, onRescheduled }) {
  const [rescheduledDate, setRescheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!order) return null

  const handleReschedule = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      const updated = await orderApi.reschedule(order.id, {
        rescheduledDate: rescheduledDate || undefined,
        notes: notes.trim() || undefined,
      })
      if (onRescheduled) onRescheduled(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to reschedule order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reschedule Order #${order.id}`}
      subtitle="Delivery Attempt Recovery"
      maxWidth="500px"
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '14px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReschedule} className="modal-form">
        <p className="form-description" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
          Your previous delivery attempt could not be completed. Choose a preferred retry date or provide gate/access instructions for the delivery agent.
        </p>

        <label>
          Preferred Delivery Date
          <input
            type="date"
            value={rescheduledDate}
            onChange={(e) => setRescheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            autoFocus
          />
        </label>

        <label>
          Delivery Instructions / Access Notes (Optional)
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Please ring doorbell #402 or leave with security gate"
          />
        </label>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            <IconClock size={15} />
            <span>{busy ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
