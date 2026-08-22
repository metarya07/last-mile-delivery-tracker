import { apiRequest } from './client'

export const authApi = {
  /**
   * Log in with email and password
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{token: string, id: number, name: string, email: string, role: string}>}
   */
  async login({ email, password }) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  /**
   * Register a new user (CUSTOMER role by default on backend)
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} [data.phone]
   * @returns {Promise<{token: string, id: number, name: string, email: string, role: string}>}
   */
  async register({ name, email, password, phone }) {
    const payload = { name, email, password }
    if (phone && phone.trim()) {
      payload.phone = phone.trim()
    }
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Get current authenticated user profile
   * @returns {Promise<{token: string, id: number, name: string, email: string, role: string}>}
   */
  async getProfile() {
    return apiRequest('/api/auth/profile', {
      method: 'GET',
    })
  },

  /**
   * Request password reset OTP email
   * @param {string} email
   * @returns {Promise<void>}
   */
  async forgotPassword(email) {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  /**
   * Verify the 6-digit OTP
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<void>}
   */
  async verifyOtp(email, otp) {
    return apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
  },

  /**
   * Set new password with OTP
   * @param {string} email
   * @param {string} otp
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async resetPassword(email, otp, newPassword) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    })
  },
}
