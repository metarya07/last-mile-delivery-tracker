const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && envUrl !== 'http://localhost:8080') {
    return envUrl
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://acid-canola-cesarean.ngrok-free.dev'
  }
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8080`
  }
  return 'http://localhost:8080'
}

const BASE_URL = getBaseUrl()

let authFailureHandler = null

export const setAuthFailureHandler = (handler) => {
  authFailureHandler = handler
}

/**
 * Standard API request wrapper
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function apiRequest(path, options = {}) {
  const sessionData = localStorage.getItem('lmd-session')
  let token = null
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData)
      token = parsed?.token
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Only standard headers to prevent CORS preflight header rejection
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let url = `${BASE_URL}${path}`
  if (url.includes('ngrok')) {
    url += (url.includes('?') ? '&' : '?') + 'ngrok-skip-browser-warning=69420'
  }

  let response

  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (networkError) {
    throw new Error('Network error: Unable to reach the server. Please check your backend connection.', {
      cause: networkError,
    })
  }

  if (response.status === 401) {
    let message = null
    try {
      const errJson = await response.json()
      message = errJson?.error || errJson?.message
    } catch {
      // Body wasn't JSON
    }

    if (path.includes('/api/auth/login')) {
      throw new Error(message || 'Incorrect password or email. Please try again.')
    }

    if (authFailureHandler) {
      authFailureHandler()
    }
    throw new Error(message || 'Your session has expired or authentication failed. Please sign in again.')
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson?.error) {
        errorMessage = errorJson.error
      } else if (errorJson?.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Response body wasn't JSON
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return null
}
