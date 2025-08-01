import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Test {
  id: string
  title: string
  file: string
  status: 'not-run' | 'passed' | 'failed' | 'skipped' | 'running'
  duration?: number
  lastRun?: string
  error?: string
  browser?: string
  tags?: string[]
}

export interface TestExecutionResult {
  testId: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

export interface TestExecutionProgress {
  current: number
  total: number
  currentTest?: string
  elapsedTime: number
}

interface TestState {
  tests: Test[]
  selectedTests: string[]
  isLoading: boolean
  isExecuting: boolean
  executionProgress: TestExecutionProgress | null
  lastExecutionResults: {
    passed: number
    failed: number
    total: number
    duration: number
  } | null
  error: string | null
}

const initialState: TestState = {
  tests: [],
  selectedTests: [],
  isLoading: false,
  isExecuting: false,
  executionProgress: null,
  lastExecutionResults: null,
  error: null,
}

// Async thunks
export const loadTests = createAsyncThunk('tests/loadTests', async () => {
  const response = await fetch('/api/tests', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to load tests')
  }

  return response.json()
})

export const runTests = createAsyncThunk(
  'tests/runTests',
  async (testIds: string[], { dispatch }) => {
    const response = await fetch('/api/tests/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ testIds }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to start test execution')
    }

    // Start polling for progress updates
    const pollProgress = () => {
      const interval = setInterval(async () => {
        try {
          const progressResponse = await fetch('/api/tests/progress', {
            credentials: 'include',
          })
          
          if (progressResponse.ok) {
            const progress = await progressResponse.json()
            dispatch(updateExecutionProgress(progress))
            
            if (progress.completed) {
              clearInterval(interval)
              dispatch(loadTests()) // Reload tests when execution is complete
            }
          }
        } catch (error) {
          console.error('Failed to fetch progress:', error)
        }
      }, 1000)
    }

    pollProgress()
    return response.json()
  }
)

export const stopTests = createAsyncThunk('tests/stopTests', async () => {
  const response = await fetch('/api/tests/stop', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to stop test execution')
  }

  return response.json()
})

const testSlice = createSlice({
  name: 'tests',
  initialState,
  reducers: {
    toggleTestSelection: (state, action: PayloadAction<string>) => {
      const testId = action.payload
      const index = state.selectedTests.indexOf(testId)
      
      if (index > -1) {
        state.selectedTests.splice(index, 1)
      } else {
        state.selectedTests.push(testId)
      }
    },
    selectAllTests: (state) => {
      state.selectedTests = state.tests.map(test => test.id)
    },
    clearTestSelection: (state) => {
      state.selectedTests = []
    },
    updateExecutionProgress: (state, action: PayloadAction<TestExecutionProgress>) => {
      state.executionProgress = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    updateTestStatus: (state, action: PayloadAction<{ testId: string; status: Test['status']; duration?: number }>) => {
      const { testId, status, duration } = action.payload
      const test = state.tests.find(t => t.id === testId)
      if (test) {
        test.status = status
        test.lastRun = new Date().toISOString()
        if (duration !== undefined) {
          test.duration = duration
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load tests
      .addCase(loadTests.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadTests.fulfilled, (state, action) => {
        state.isLoading = false
        state.tests = action.payload
      })
      .addCase(loadTests.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to load tests'
      })
      // Run tests
      .addCase(runTests.pending, (state) => {
        state.isExecuting = true
        state.error = null
        state.executionProgress = null
      })
      .addCase(runTests.fulfilled, (state, action) => {
        // Keep isExecuting true until progress indicates completion
        state.lastExecutionResults = action.payload
      })
      .addCase(runTests.rejected, (state, action) => {
        state.isExecuting = false
        state.error = action.error.message || 'Test execution failed'
      })
      // Stop tests
      .addCase(stopTests.fulfilled, (state) => {
        state.isExecuting = false
        state.executionProgress = null
      })
  },
})

export const {
  toggleTestSelection,
  selectAllTests,
  clearTestSelection,
  updateExecutionProgress,
  clearError,
  updateTestStatus,
} = testSlice.actions

export default testSlice.reducer
