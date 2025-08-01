import Layout from '../components/Layout'

const TestManagementPage: React.FC = () => {
  return (
    <Layout>
      <div className="test-management-container">
        <header className="page-header">
          <h1>Test Management</h1>
          <p>Manage and execute your Playwright test suites</p>
        </header>
        
        <div className="test-content">
          <p>Test management functionality will be implemented here.</p>
        </div>
      </div>
    </Layout>
  )
}

export default TestManagementPage
