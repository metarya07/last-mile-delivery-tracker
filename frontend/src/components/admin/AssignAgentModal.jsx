import { useEffect, useState } from 'react'
import { userApi } from '../../api/userApi'
import { orderApi } from '../../api/orderApi'
import { Modal } from '../common/Modal'

export function AssignAgentModal({ isOpen, onClose, order, onAssigned }) {
  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !order) return
    let isMounted = true

    const loadAgents = async () => {
      try {
        const list = await userApi.getAvailableDeliveryAgents()
        if (isMounted) {
          setAgents(list || [])
          if (list && list.length > 0) {
            setSelectedAgentId(list[0].id)
          }
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load available delivery agents.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAgents()

    return () => {
      isMounted = false
    }
  }, [isOpen, order])

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!selectedAgentId || !order) return
    setBusy(true)
    setError('')
    try {
      const updated = await orderApi.assignAgent(order.id, selectedAgentId)
      onAssigned(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to assign delivery agent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `Assign Agent to Order #${order.id}` : 'Assign Delivery Agent'}
      subtitle="Dispatch Administration"
      maxWidth="500px"
    >
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="modal-loading">Checking available delivery agents...</div>
      ) : agents.length === 0 ? (
        <div className="empty-state-notice">
          <p>No delivery agents are currently marked as available/online.</p>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ marginTop: '12px' }}>
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleAssign} className="modal-form">
          <label>
            Select Available Delivery Agent:
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              required
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.email}) {ag.phone ? `- ${ag.phone}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
