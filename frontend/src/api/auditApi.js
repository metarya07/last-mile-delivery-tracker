import { apiRequest } from './client'

export const auditApi = {
  /**
   * Get recent audit logs (ADMIN and DISPATCHER)
   */
  async getRecentAuditLogs() {
    return apiRequest('/api/audit-logs', {
      method: 'GET',
    })
  },

  /**
   * Get audit logs filtered by user ID (ADMIN only)
   */
  async getAuditLogsByUser(userId) {
    return apiRequest(`/api/audit-logs/user/${userId}`, {
      method: 'GET',
    })
  },

  /**
   * Get audit logs filtered by action name (ADMIN only)
   */
  async getAuditLogsByAction(action) {
    return apiRequest(`/api/audit-logs/action/${action}`, {
      method: 'GET',
    })
  },
}
