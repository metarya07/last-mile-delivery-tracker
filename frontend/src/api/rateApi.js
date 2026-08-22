import { apiRequest } from './client'

export const rateApi = {
  /**
   * Pre-booking rate calculation estimate
   * @param {Object} data
   * @param {number} data.pickupZoneId
   * @param {number} data.dropZoneId
   * @param {number} data.lengthCm
   * @param {number} data.widthCm
   * @param {number} data.heightCm
   * @param {number} data.actualWeightKg
   * @param {'B2B'|'B2C'} data.orderType
   * @param {'PREPAID'|'COD'} data.paymentType
   * @returns {Promise<Object>}
   */
  async estimateRate(data) {
    return apiRequest('/api/rates/estimate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get all zones with assigned areas
   * @returns {Promise<Array<Object>>}
   */
  async getZones() {
    return apiRequest('/api/zones', {
      method: 'GET',
    })
  },

  /**
   * Create a new zone (ADMIN only)
   * @param {{ name: string }} data
   * @returns {Promise<Object>}
   */
  async createZone(data) {
    return apiRequest('/api/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Add an area to a zone (ADMIN only)
   * @param {number|string} zoneId
   * @param {{ areaName: string }} data
   * @returns {Promise<Object>}
   */
  async addAreaToZone(zoneId, data) {
    return apiRequest(`/api/zones/${zoneId}/areas`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get all rate cards (ADMIN only)
   * @returns {Promise<Array<Object>>}
   */
  async getRateCards() {
    return apiRequest('/api/rates', {
      method: 'GET',
    })
  },

  /**
   * Create or update rate card (ADMIN only)
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async saveRateCard(data) {
    return apiRequest('/api/rates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Edit existing rate card (ADMIN only)
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateRateCard(id, data) {
    return apiRequest(`/api/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Get all COD surcharges (ADMIN only)
   * @returns {Promise<Array<Object>>}
   */
  async getCodCharges() {
    return apiRequest('/api/rates/cod', {
      method: 'GET',
    })
  },

  /**
   * Update COD surcharge (ADMIN only)
   * @param {{ orderType: 'B2B'|'B2C', surcharge: number }} data
   * @returns {Promise<Object>}
   */
  async saveCodCharge(data) {
    return apiRequest('/api/rates/cod', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}
