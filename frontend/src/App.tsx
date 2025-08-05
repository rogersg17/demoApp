import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { checkAuth } from './store/slices/authSlice'
import type { RootState, AppDispatch } from './store/store'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TestManagementPage from './pages/TestManagementPage'
import FlakyTestsPage from './pages/FlakyTestsPage'
import TabbedSettingsPage from './pages/TabbedSettingsPage'
import UserManagementPage from './pages/UserManagementPage'
import GitHubActionsPage from './pages/GitHubActionsPage'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'
import './styles/pages.css'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tests"
        element={
          <ProtectedRoute>
            <TestManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/flaky-tests"
        element={
          <ProtectedRoute>
            <FlakyTestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <TabbedSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/github-actions"
        element={
          <ProtectedRoute>
            <GitHubActionsPage />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  )
}

export default App
