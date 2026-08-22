import { apiRequest } from './client'

export const deliveryPartnerApplicationApi = {
  /**
   * Submit a new delivery partner application (CUSTOMER only)
   * @param {Object} data
   * @param {string} data.vehicleType
   * @param {string} [data.vehicleNumber]
   * @param {string} data.drivingLicense
   * @param {string} [data.preferredArea]
   * @returns {Promise<Object>}
   */
  async submitApplication(data) {
    return apiRequest('/api/delivery-partner-applications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get current customer's latest delivery partner application (CUSTOMER only)
   * @returns {Promise<Object|null>}
   */
  async getMyApplication() {
    return apiRequest('/api/delivery-partner-applications/mine', {
      method: 'GET',
    })
  },

  /**
   * Get all delivery partner applications (ADMIN only)
   * @returns {Promise<Array<Object>>}
   */
  async getAllApplications() {
    return apiRequest('/api/delivery-partner-applications', {
      method: 'GET',
    })
  },

  /**
   * Get single application by ID (ADMIN only)
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getApplication(id) {
    return apiRequest(`/api/delivery-partner-applications/${id}`, {
      method: 'GET',
    })
  },

  /**
   * Approve application and promote applicant to DELIVERY_AGENT (ADMIN only)
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async approveApplication(id) {
    return apiRequest(`/api/delivery-partner-applications/${id}/approve`, {
      method: 'POST',
    })
  },

  /**
   * Reject application with reason (ADMIN only)
   * @param {number|string} id
   * @param {Object} payload
   * @param {string} payload.reason
   * @returns {Promise<Object>}
   */
  async rejectApplication(id, { reason }) {
    return apiRequest(`/api/delivery-partner-applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
}
