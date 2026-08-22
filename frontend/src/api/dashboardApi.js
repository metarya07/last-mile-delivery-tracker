import { apiRequest } from './client'

export const dashboardApi = {
  /**
   * Get dashboard summary counts for current authenticated user
   * @returns {Promise<Record<string, number>>}
   */
  async getSummary() {
    return apiRequest('/api/dashboard', {
      method: 'GET',
    })
  },
}
