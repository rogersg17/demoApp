import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  status: string
  department: string
  lastActive: string
  avatar: string
}

interface UserApiData {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  status: string
  department: string
  last_login: string | null
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const formatLastActive = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never'
    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return minutes <= 0 ? 'Just now' : `${minutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
  }

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load users')
      }
      
      const userData: UserApiData[] = await response.json()
      
      const transformedUsers: User[] = userData.map((user: UserApiData) => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status,
        department: user.department,
        lastActive: formatLastActive(user.last_login),
        avatar: (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase()
      }))
      
      setUsers(transformedUsers)
      setError(null)
    } catch (err) {
      setError('Failed to load users. Please refresh the page.')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const filterUsers = useCallback(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    if (selectedStatus) {
      filtered = filtered.filter(user => user.status === selectedStatus)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, selectedRole, selectedStatus])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    filterUsers()
  }, [filterUsers])

  const getStats = () => {
    const total = users.length
    const active = users.filter(u => u.status === 'active').length
    const admins = users.filter(u => u.role === 'admin').length
    const inactive = users.filter(u => u.status === 'inactive').length

    return { total, active, admins, inactive }
  }

  const stats = getStats()

  if (loading) {
    return (
      <Layout>
        <div className="users-container">
          <div className="loading">Loading users...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="users-container">
          <div className="error">{error}</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="users-container">
        <header className="page-header">
          <h1>User Management</h1>
          <p>Manage user accounts and permissions</p>
        </header>
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <div className="stat-number">{stats.total}</div>
          </div>
          <div className="stat-card">
            <h3>Active Users</h3>
            <div className="stat-number">{stats.active}</div>
          </div>
          <div className="stat-card">
            <h3>Administrators</h3>
            <div className="stat-number">{stats.admins}</div>
          </div>
          <div className="stat-card">
            <h3>Inactive Users</h3>
            <div className="stat-number">{stats.inactive}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="tester">Tester</option>
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">{user.avatar}</div>
                      <div className="user-details">
                        <div className="user-name">{user.firstName} {user.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department}</td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.lastActive}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit">Edit</button>
                      <button className="btn-delete">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="no-results">
            No users found matching your criteria.
          </div>
        )}
      </div>
    </Layout>
  )
}

export default UserManagementPage
