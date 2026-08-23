import { apiRequest } from './client'

export const userApi = {
  /**
   * Get all users (ADMIN only)
   * @returns {Promise<Array<{id: number, name: string, email: string, phone: string|null, role: string, available: boolean}>>}
   */
  async getAllUsers() {
    return apiRequest('/api/users', {
      method: 'GET',
    })
  },

  /**
   * Get delivery agents (ADMIN and DISPATCHER)
   * @param {Object} [options]
   * @param {boolean} [options.available]
   * @returns {Promise<Array<{id: number, name: string, email: string, phone: string|null, role: string, available: boolean}>>}
   */
  async getDeliveryAgents(options = {}) {
    const query = options.available !== undefined ? `?available=${options.available}` : ''
    return apiRequest(`/api/users/delivery-agents${query}`, {
      method: 'GET',
    })
  },

  /**
   * Get available delivery agents (ADMIN and DISPATCHER)
   * @returns {Promise<Array<{id: number, name: string, email: string, phone: string|null, role: string, available: boolean}>>}
   */
  async getAvailableDeliveryAgents() {
    return this.getDeliveryAgents({ available: true })
  },

  /**
   * Update a user's role (ADMIN only)
   * @param {number|string} id
   * @param {{ role: string, assignedZoneId?: number|null }} roleData
   * @returns {Promise<{id: number, name: string, email: string, phone: string|null, role: string, available: boolean}>}
   */
  async updateUserRole(id, roleData) {
    return apiRequest(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    })
  },

  /**
   * Update delivery agent availability (DELIVERY_AGENT only)
   * @param {boolean} available
   * @returns {Promise<{id: number, name: string, email: string, phone: string|null, role: string, available: boolean}>}
   */
  async updateAvailability(available) {
    return apiRequest('/api/users/availability', {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    })
  },

  /**
   * Delete user by ID (ADMIN only)
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async deleteUser(id) {
    return apiRequest(`/api/users/${id}`, {
      method: 'DELETE',
    })
  },
}
