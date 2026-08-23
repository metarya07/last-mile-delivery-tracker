import { apiRequest } from './client'

export const orderApi = {
  /**
   * Create a new order (CUSTOMER or ADMIN/DISPATCHER on behalf of customer)
   * @param {Object} data
   * @param {string} data.pickupAddress
   * @param {string} data.dropAddress
   * @param {number} data.pickupZoneId
   * @param {number} data.dropZoneId
   * @param {number} data.lengthCm
   * @param {number} data.widthCm
   * @param {number} data.heightCm
   * @param {number} data.actualWeightKg
   * @param {'B2B'|'B2C'} data.orderType
   * @param {'PREPAID'|'COD'} data.paymentType
   * @param {number} [data.customerId]
   * @returns {Promise<Object>}
   */
  async createOrder(data) {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get orders relevant to current authenticated user
   * (CUSTOMER: own orders, DELIVERY_AGENT: assigned orders, WAREHOUSE_STAFF: zone orders, ADMIN/DISPATCHER: all orders)
   * @returns {Promise<Array<Object>>}
   */
  async getMyOrders() {
    return apiRequest('/api/orders', {
      method: 'GET',
    })
  },

  /**
   * Get single order details by ID
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getOrderById(id) {
    return apiRequest(`/api/orders/${id}`, {
      method: 'GET',
    })
  },

  /**
   * Update order status (ADMIN/DISPATCHER or assigned DELIVERY_AGENT or WAREHOUSE_STAFF)
   * @param {number|string} id
   * @param {Object} payload
   * @param {string} payload.status
   * @param {string} [payload.failureReason]
   * @returns {Promise<Object>}
   */
  async updateStatus(id, { status, failureReason }) {
    const body = { status }
    if (failureReason) {
      body.failureReason = failureReason
    }
    return apiRequest(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  /**
   * Update live GPS location for an order (DELIVERY_AGENT only)
   * @param {number|string} orderId
   * @param {{ latitude: number, longitude: number }} location
   * @returns {Promise<Object>}
   */
  async updateLocation(orderId, location) {
    return apiRequest(`/api/orders/${orderId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(location),
    })
  },

  /**
   * Upload Proof of Delivery (DELIVERY_AGENT only)
   * @param {number|string} orderId
   * @param {{ podUrl: string, signatureUrl?: string, recipientName?: string, notes?: string }} podData
   * @returns {Promise<Object>}
   */
  async uploadProofOfDelivery(orderId, podData) {
    return apiRequest(`/api/orders/${orderId}/proof-of-delivery`, {
      method: 'POST',
      body: JSON.stringify(podData),
    })
  },

  /**
   * Assign delivery agent to order (ADMIN or DISPATCHER)
   * @param {number|string} orderId
   * @param {number|string} agentId
   * @returns {Promise<Object>}
   */
  async assignAgent(orderId, agentId) {
    return apiRequest(`/api/orders/${orderId}/assign/${agentId}`, {
      method: 'POST',
    })
  },

  /**
   * Automatically detect and assign nearest/best available delivery agent (ADMIN or DISPATCHER)
   * @param {number|string} orderId
   * @returns {Promise<Object>}
   */
  async autoAssign(orderId) {
    return apiRequest(`/api/orders/${orderId}/auto-assign`, {
      method: 'POST',
    })
  },

  /**
   * Reschedule a failed order for a new delivery attempt (CUSTOMER or ADMIN/DISPATCHER)
   * @param {number|string} orderId
   * @param {Object} [payload]
   * @param {string} [payload.rescheduledDate]
   * @param {string} [payload.notes]
   * @returns {Promise<Object>}
   */
  async reschedule(orderId, payload = {}) {
    return apiRequest(`/api/orders/${orderId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get order tracking history
   * @param {number|string} id
   * @returns {Promise<Array<{id: number, orderId: number, status: string, actorId: number|null, actorName: string|null, createdAt: string}>>}
   */
  async getTrackingHistory(id) {
    return apiRequest(`/api/orders/${id}/tracking`, {
      method: 'GET',
    })
  },

  /**
   * Get order delivery attempts
   * @param {number|string} id
   * @returns {Promise<Array<{id: number, orderId: number, deliveryAgentId: number|null, deliveryAgentName: string|null, attemptNumber: number, status: string, failureReason: string|null, attemptedAt: string}>>}
   */
  async getDeliveryAttempts(id) {
    return apiRequest(`/api/orders/${id}/attempts`, {
      method: 'GET',
    })
  },
}
