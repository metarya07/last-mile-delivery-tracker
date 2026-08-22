const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const url = `${BASE_URL}${path}`
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
    if (authFailureHandler) {
      authFailureHandler()
    }
    throw new Error('Your session has expired or authentication failed. Please sign in again.')
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
