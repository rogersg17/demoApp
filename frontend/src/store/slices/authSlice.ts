import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { apiCall } from '../../config/api'

interface User {
  username: string
  email?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }) => {
    const response = await apiCall('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Login failed'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    // Parse successful response
    try {
      const data = await response.json()
      return data
    } catch {
      throw new Error('Invalid server response')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  const response = await apiCall('/api/logout', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Logout failed')
  }

  // Don't try to parse JSON for logout response
  return null
})

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const response = await apiCall('/api/settings', {
    method: 'HEAD',
  })

  if (response.ok) {
    const loggedInUser = sessionStorage.getItem('loggedInUser')
    return { username: loggedInUser || 'User' }
  }

  throw new Error('Not authenticated')
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.isAuthenticated = true
        sessionStorage.setItem('loggedInUser', action.payload.user.username)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Login failed'
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        sessionStorage.removeItem('loggedInUser')
      })
      // Check Auth
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, setError, setUser } = authSlice.actions
export default authSlice.reducer
