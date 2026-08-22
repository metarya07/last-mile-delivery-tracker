import { useState } from 'react'
import { orderApi } from '../../api/orderApi'
import { Modal } from '../common/Modal'
import { StatusBadge } from '../common/StatusBadge'

const ALLOWED_TRANSITIONS = {
  PLACED: ['PICKED_UP'],
  RESCHEDULED: ['OUT_FOR_DELIVERY'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['RESCHEDULED'],
  DELIVERED: [],
}

const COMMON_FAILURE_REASONS = [
  'Customer unavailable / Phone unanswered',
  'Incorrect / incomplete delivery address',
  'Customer requested reschedule',
  'Cash on Delivery payment refused',
  'Premises locked / Security refused entry',
  'Damaged outer packaging',
]

export function StatusTransitionModal({ isOpen, onClose, order, onStatusUpdated }) {
  const availableTransitions = order ? ALLOWED_TRANSITIONS[order.status] || [] : []

  const [selectedStatus, setSelectedStatus] = useState('')
  const [failureReason, setFailureReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targetStatus = selectedStatus || (availableTransitions.length > 0 ? availableTransitions[0] : '')

  const handleClose = () => {
    setSelectedStatus('')
    setFailureReason('')
    setCustomReason('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetStatus || !order) return

    let reason = undefined
    if (targetStatus === 'FAILED') {
      reason = failureReason === 'Other' ? customReason.trim() : failureReason
      if (!reason) {
        setError('Please provide a failure reason for the unfulfilled attempt.')
        return
      }
    }

    setBusy(true)
    setError('')

    try {
      const updated = await orderApi.updateStatus(order.id, {
        status: targetStatus,
        failureReason: reason,
      })
      onStatusUpdated(updated)
      handleClose()
    } catch (err) {
      setError(err.message || 'Status transition failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={order ? `Update Order #${order.id}` : 'Update Delivery Status'}
      subtitle="Delivery Agent Operations"
      maxWidth="500px"
    >
      {error && <div className="alert alert-error">{error}</div>}

      {order ? (
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="status-transition-current">
            <span>Current Status:</span>
            <StatusBadge status={order.status} />
          </div>

          {availableTransitions.length === 0 ? (
            <div className="alert alert-info">
              This order has reached terminal status (<strong>{order.status}</strong>) and cannot be transitioned further.
            </div>
          ) : (
            <>
              <label>
                Advance Status To:
                <select
                  value={targetStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  required
                >
                  {availableTransitions.map((st) => (
                    <option key={st} value={st}>
                      {st.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              {targetStatus === 'FAILED' && (
                <div className="failure-reason-box">
                  <label>
                    Delivery Failure Reason:
                    <select
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      required
                    >
                      <option value="">-- Select a reason --</option>
                      {COMMON_FAILURE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      <option value="Other">Other / Custom Reason</option>
                    </select>
                  </label>

                  {failureReason === 'Other' && (
                    <label style={{ marginTop: '8px' }}>
                      Specify Reason:
                      <textarea
                        rows={2}
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Describe the cause of delivery failure"
                        required
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy ? 'Updatingâ€¦' : 'Confirm Status Change'}
                </button>
              </div>
            </>
          )}
        </form>
      ) : null}
    </Modal>
  )
}
