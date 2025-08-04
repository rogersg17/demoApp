// API Configuration
// Use environment variable for backend URL, defaulting to the standard backend port
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 5000, // Shorter timeout to avoid hanging
  withCredentials: true, // Important for session cookies
}

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add timeout using AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout)

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

export default apiConfig
