import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../store/slices/authSlice'
import type { RootState, AppDispatch } from '../store/store'
import './Layout.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = async () => {
    try {
      await dispatch(logout())
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActivePage = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Demo App</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="avatar">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face" 
                alt="User profile" 
                className="avatar-img"
              />
            </div>
            <span className="welcome-message">Welcome, {user?.username}!</span>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-btn"
            title="Sign out"
          >
            <i className="fas fa-sign-out-alt"></i>
            Sign Out
          </button>
        </div>
      </header>

      <nav className="app-sidebar">
        <Link 
          to="/dashboard" 
          className={`nav-link ${isActivePage('/dashboard') ? 'active' : ''}`}
          title="Dashboard"
        >
          <i className="fas fa-home"></i>
          <span>Dashboard</span>
        </Link>
        <Link 
          to="/tests" 
          className={`nav-link ${isActivePage('/tests') ? 'active' : ''}`}
          title="Test Management"
        >
          <i className="fas fa-vial"></i>
          <span>Tests</span>
        </Link>
        <Link 
          to="/flaky-tests" 
          className={`nav-link ${isActivePage('/flaky-tests') ? 'active' : ''}`}
          title="Flaky Test Detection"
        >
          <i className="fas fa-exclamation-triangle"></i>
          <span>Flaky Tests</span>
        </Link>
        <Link 
          to="/users" 
          className={`nav-link ${isActivePage('/users') ? 'active' : ''}`}
          title="User Management"
        >
          <i className="fas fa-users"></i>
          <span>Users</span>
        </Link>
        <Link 
          to="/settings" 
          className={`nav-link ${isActivePage('/settings') ? 'active' : ''}`}
          title="Settings"
        >
          <i className="fas fa-cog"></i>
          <span>Settings</span>
        </Link>
      </nav>

      <main className="app-main">
        {children}
      </main>
    </div>
  )
}

export default Layout
