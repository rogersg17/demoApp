import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import './DashboardPage.css'

const DashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  // Mock test stats for now
  const testStats = {
    total: 0,
    passed: 0,
    failed: 0,
    notRun: 0,
  }

  return (
    <Layout>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Welcome back, {user?.username || 'User'}!</h1>
          <p>Here's an overview of your test management dashboard.</p>
        </header>

        <div className="dashboard-grid">
          {/* Quick Stats */}
          <section className="stats-section">
            <h2>Test Overview</h2>
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-icon">
                  <i className="fas fa-vial"></i>
                </div>
                <div className="stat-info">
                  <h3>{testStats.total}</h3>
                  <p>Total Tests</p>
                </div>
              </div>
              
              <div className="stat-card passed">
                <div className="stat-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-info">
                  <h3>{testStats.passed}</h3>
                  <p>Passing</p>
                </div>
              </div>
              
              <div className="stat-card failed">
                <div className="stat-icon">
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="stat-info">
                  <h3>{testStats.failed}</h3>
                  <p>Failed</p>
                </div>
              </div>
              
              <div className="stat-card not-run">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-info">
                  <h3>{testStats.notRun}</h3>
                  <p>Not Run</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="actions-section">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              <Link to="/tests" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-play"></i>
                </div>
                <h3>Run Tests</h3>
                <p>Execute your Playwright test suites</p>
              </Link>
              
              <Link to="/tests" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-list"></i>
                </div>
                <h3>View Tests</h3>
                <p>Browse and manage your test cases</p>
              </Link>
              
              <Link to="/settings" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-cog"></i>
                </div>
                <h3>Settings</h3>
                <p>Configure test execution parameters</p>
              </Link>
              
              <Link to="/users" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-users"></i>
                </div>
                <h3>Users</h3>
                <p>Manage user accounts and permissions</p>
              </Link>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="activity-section">
            <h2>Recent Test Activity</h2>
            <div className="activity-list">
              <p className="no-activity">No recent test activity</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
