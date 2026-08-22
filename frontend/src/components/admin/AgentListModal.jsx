import { useEffect, useState } from 'react'
import { userApi } from '../../api/userApi'
import { Modal } from '../common/Modal'

export function AgentListModal({ isOpen, onClose }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    const load = async () => {
      try {
        const list = await userApi.getDeliveryAgents()
        if (isMounted) {
          setAgents(list || [])
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load delivery agents')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user ${name} (ID: ${id})?`)) {
      return
    }
    setActionError('')
    try {
      await userApi.deleteUser(id)
      setAgents((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setActionError(err.message || 'Failed to delete user')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Available Delivery Agents"
      subtitle="Fleet Directory"
      maxWidth="600px"
    >
      {error && <div className="alert alert-error">{error}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {loading ? (
        <div className="modal-loading">Loading fleet listâ€¦</div>
      ) : agents.length === 0 ? (
        <p className="empty-state-notice">No agents currently available/online.</p>
      ) : (
        <div className="agent-directory-list">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-row">
              <div className="agent-info">
                <span className={`dot ${agent.available ? 'dot-online' : 'dot-offline'}`} title={agent.available ? 'Online' : 'Offline'} />
                <div>
                  <strong>{agent.name} {agent.available ? '' : '(Offline)'}</strong>
                  <span className="agent-meta">{agent.email} {agent.phone ? `Â· ${agent.phone}` : ''}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => handleDelete(agent.id, agent.name)}
                title="Delete User"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
