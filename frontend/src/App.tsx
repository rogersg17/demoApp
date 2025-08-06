import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store/store'
import { checkAuth } from './store/slices/authSlice'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TestManagementPage from './pages/TestManagementPage'
import UserManagementPage from './pages/UserManagementPage'
import TabbedSettingsPage from './pages/TabbedSettingsPage'
import FlakyTestsPage from './pages/FlakyTestsPage'
import GitHubActionsPage from './pages/GitHubActionsPage'
import LoadingSpinner from './components/LoadingSpinner'
import './App.css'

function AppContent() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)
  const [initialAuthCheck, setInitialAuthCheck] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Only check auth on initial load, not when navigating from login
    if (!initialAuthCheck && location.pathname !== '/login') {
      dispatch(checkAuth()).finally(() => {
        setInitialAuthCheck(true)
      })
    } else if (location.pathname === '/login') {
      setInitialAuthCheck(true)
    }
  }, [dispatch, initialAuthCheck, location.pathname])

  // Show loading only during initial auth check, not during login flow
  if (!initialAuthCheck && isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {isAuthenticated ? (
          <>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tests" element={<TestManagementPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/settings" element={<TabbedSettingsPage />} />
            <Route path="/flaky-tests" element={<FlakyTestsPage />} />
            <Route path="/github-actions" element={<GitHubActionsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </div>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </Router>
  )
}

export default App
