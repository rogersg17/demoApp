import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface NewUser {
  username: string
  email: string
  firstName: string
  lastName: string
  password: string
  department: string
  role: string
  status: string
}

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [addUserError, setAddUserError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    department: '',
    role: 'user',
    status: 'active'
  })

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
          navigate('/login')
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

  const validateUser = (user: NewUser): string | null => {
    // Username validation
    if (!user.username || user.username.length < 3 || user.username.length > 50) {
      return 'Username must be 3-50 characters long'
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(user.username)) {
      return 'Username can only contain letters, numbers, dots, dashes, and underscores'
    }

    // Email validation
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      return 'Please enter a valid email address'
    }

    // First name validation
    if (!user.firstName || user.firstName.length < 1 || user.firstName.length > 50) {
      return 'First name must be 1-50 characters long'
    }
    if (!/^[a-zA-Z\s'-]+$/.test(user.firstName)) {
      return 'First name can only contain letters, spaces, apostrophes, and hyphens'
    }

    // Last name validation
    if (!user.lastName || user.lastName.length < 1 || user.lastName.length > 50) {
      return 'Last name must be 1-50 characters long'
    }
    if (!/^[a-zA-Z\s'-]+$/.test(user.lastName)) {
      return 'Last name can only contain letters, spaces, apostrophes, and hyphens'
    }

    // Password validation
    if (!user.password || user.password.length < 8 || user.password.length > 128) {
      return 'Password must be 8-128 characters long'
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(user.password)) {
      return 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)'
    }

    // Department validation (optional)
    if (user.department && user.department.length > 100) {
      return 'Department must be no more than 100 characters'
    }

    return null
  }

  const handleAddUser = async () => {
    try {
      setAddingUser(true)
      setAddUserError(null)

      // Client-side validation
      const validationError = validateUser(newUser)
      if (validationError) {
        setAddUserError(validationError)
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        await response.json()
        setShowAddModal(false)
        setNewUser({
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          department: '',
          role: 'user',
          status: 'active'
        })
        await loadUsers()
      } else {
        const errorData = await response.json()
        if (errorData.details && Array.isArray(errorData.details)) {
          setAddUserError(errorData.details.join('. '))
        } else {
          setAddUserError(errorData.error || 'Failed to create user')
        }
      }
    } catch (err) {
      setAddUserError('Failed to create user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleCancelAdd = () => {
    setShowAddModal(false)
    setAddUserError(null)
    setNewUser({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      department: '',
      role: 'user',
      status: 'active'
    })
  }

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        // Reload users list to reflect the deletion
        await loadUsers()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete user: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      alert('Failed to delete user. Please try again.')
    }
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
          <div className="header-content">
            <div>
              <h1>User Management</h1>
              <p>Manage user accounts and permissions</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add User
            </button>
          </div>
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
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                      >
                        Delete
                      </button>
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

        {/* Add User Modal */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Add New User</h3>
                <button 
                  className="modal-close"
                  onClick={handleCancelAdd}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {addUserError && (
                  <div className="alert alert-error">{addUserError}</div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username</label>
                    <input 
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="3-50 chars: letters, numbers, dots, dashes, underscores"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>First Name</label>
                    <input 
                      type="text"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Letters, spaces, apostrophes, hyphens only"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input 
                      type="text"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Letters, spaces, apostrophes, hyphens only"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="8+ chars: uppercase, lowercase, number, special char"
                    />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input 
                      type="text"
                      value={newUser.department}
                      onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter department"
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select 
                      value={newUser.role}
                      onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      value={newUser.status}
                      onChange={(e) => setNewUser(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={handleCancelAdd}
                  disabled={addingUser}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddUser}
                  disabled={addingUser}
                >
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default UserManagementPage
