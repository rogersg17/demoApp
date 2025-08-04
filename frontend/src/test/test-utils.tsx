import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import authSlice from '../store/slices/authSlice';
import testSlice from '../store/slices/testSlice';
import settingsSlice from '../store/slices/settingsSlice';

// Create a test theme
const testTheme = createTheme();

// Create a test store
export const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      test: testSlice,
      settings: settingsSlice,
    },
    preloadedState,
  });
};

// Custom render function that includes providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createTestStore>;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={testTheme}>
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Mock user for testing
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user'
};

// Mock test execution data
export const mockTestExecution = {
  id: 'exec_123',
  status: 'running',
  testFiles: ['test1.spec.ts', 'test2.spec.ts'],
  suite: 'integration',
  environment: 'staging',
  createdAt: '2024-01-01T10:00:00Z',
  startedAt: '2024-01-01T10:05:00Z',
  progress: 45,
  totalTests: 20,
  passedTests: 8,
  failedTests: 1,
  pendingTests: 11
};

// Mock settings data
export const mockSettings = {
  theme: 'light',
  notifications: true,
  autoRefresh: true,
  refreshInterval: 5000
};

// Helper to wait for async operations
export const waitForPromises = () => new Promise(setImmediate);