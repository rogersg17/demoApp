/**
 * GitHub Actions Page
 * Dedicated page for GitHub Actions CI/CD monitoring and management
 */

import React from 'react';
import Layout from '../components/Layout';
import GitHubDashboard from '../components/GitHubDashboard';

const GitHubActionsPage: React.FC = () => {
  return (
    <Layout>
      <GitHubDashboard />
    </Layout>
  );
};

export default GitHubActionsPage;
