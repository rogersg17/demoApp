import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import testSlice from './slices/testSlice'
import settingsSlice from './slices/settingsSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    tests: testSlice,
    settings: settingsSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export types from slices for easier access
export type { Test } from './slices/testSlice'
export type { TestExecutionSettings } from './slices/settingsSlice'
