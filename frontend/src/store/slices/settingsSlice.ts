import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface TestExecutionSettings {
  headless: boolean
  timeout: number
  retries: number
  browsers: string[]
  parallel: boolean
  workers: number
  slowMo: number
  video: boolean
  screenshots: boolean
  trace: boolean
  liveLogs: boolean
}

interface SettingsState {
  testExecution: TestExecutionSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

const defaultSettings: TestExecutionSettings = {
  headless: true,
  timeout: 30000,
  retries: 2,
  browsers: ['chromium'],
  parallel: true,
  workers: 4,
  slowMo: 0,
  video: false,
  screenshots: true,
  trace: false,
  liveLogs: true, // Enable live logs by default
}

const initialState: SettingsState = {
  testExecution: defaultSettings,
  isLoading: false,
  isSaving: false,
  error: null,
}

// Async thunks
export const loadSettings = createAsyncThunk('settings/loadSettings', async () => {
  const response = await fetch('/api/settings', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to load settings')
  }

  return response.json()
})

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async (settings: TestExecutionSettings) => {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to save settings')
    }

    return settings
  }
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateTestExecutionSetting: <K extends keyof TestExecutionSettings>(
      state: SettingsState,
      action: PayloadAction<{ key: K; value: TestExecutionSettings[K] }>
    ) => {
      const { key, value } = action.payload
      state.testExecution[key] = value
    },
    resetSettings: (state) => {
      state.testExecution = defaultSettings
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings
      .addCase(loadSettings.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.isLoading = false
        state.testExecution = { ...defaultSettings, ...action.payload }
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to load settings'
      })
      // Save settings
      .addCase(saveSettings.pending, (state) => {
        state.isSaving = true
        state.error = null
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.isSaving = false
        state.testExecution = action.payload
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.isSaving = false
        state.error = action.error.message || 'Failed to save settings'
      })
  },
})

export const { updateTestExecutionSetting, resetSettings, clearError } = settingsSlice.actions
export default settingsSlice.reducer
