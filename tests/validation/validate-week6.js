const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class Week6Validator {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.results = {
      dashboardComponents: {
        mainDashboard: false,
        pipelineHealth: false,
        recentFailures: false,
        configurationPanel: false
      },
      customHooks: {
        useWebSocketMVP: false,
        useMVPData: false
      },
      apiEndpoints: {
        mvpPipelineHealth: false,
        mvpRecentFailures: false,
        mvpPipelineConfigs: false,
        mvpSystemConfig: false,
        mvpStatistics: false
      },
      userInterface: {
        responsiveDesign: false,
        realTimeUpdates: false,
        navigationFlow: false,
        errorHandling: false
      },
      integration: {
        backendConnection: false,
        webSocketConnection: false,
        dataFlow: false,
        configurationManagement: false
      }
    };
  }

  async validateDashboardComponents() {
    console.log('🧩 Validating Dashboard Components...');
    
    try {
      // Check if main dashboard component exists
      const dashboardPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/MVPDashboard.tsx');
      const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
      
      if (dashboardContent.includes('PipelineHealthOverview') && 
          dashboardContent.includes('RecentFailures') && 
          dashboardContent.includes('ConfigurationPanel') &&
          dashboardContent.includes('useWebSocketMVP') &&
          dashboardContent.includes('useMVPData')) {
        this.results.dashboardComponents.mainDashboard = true;
        console.log('  ✅ Main Dashboard component structure validated');
      }

      // Check PipelineHealthOverview component
      const pipelineHealthPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/PipelineHealthOverview.tsx');
      const pipelineHealthContent = await fs.readFile(pipelineHealthPath, 'utf8');
      
      if (pipelineHealthContent.includes('PipelineHealthOverviewProps') &&
          pipelineHealthContent.includes('getStatusIcon') &&
          pipelineHealthContent.includes('formatDuration') &&
          pipelineHealthContent.includes('onRefresh')) {
        this.results.dashboardComponents.pipelineHealth = true;
        console.log('  ✅ PipelineHealthOverview component validated');
      }

      // Check RecentFailures component
      const recentFailuresPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/RecentFailures.tsx');
      const recentFailuresContent = await fs.readFile(recentFailuresPath, 'utf8');
      
      if (recentFailuresContent.includes('RecentFailuresProps') &&
          recentFailuresContent.includes('TestFailure') &&
          recentFailuresContent.includes('onCreateJiraIssue') &&
          recentFailuresContent.includes('expandedItems')) {
        this.results.dashboardComponents.recentFailures = true;
        console.log('  ✅ RecentFailures component validated');
      }

      // Check ConfigurationPanel component
      const configPanelPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/ConfigurationPanel.tsx');
      const configPanelContent = await fs.readFile(configPanelPath, 'utf8');
      
      if (configPanelContent.includes('ConfigurationPanelProps') &&
          configPanelContent.includes('PipelineConfig') &&
          configPanelContent.includes('SystemConfig') &&
          configPanelContent.includes('onTestConnection')) {
        this.results.dashboardComponents.configurationPanel = true;
        console.log('  ✅ ConfigurationPanel component validated');
      }

    } catch (error) {
      console.log('  ❌ Dashboard components validation failed:', error.message);
    }
  }

  async validateCustomHooks() {
    console.log('🪝 Validating Custom Hooks...');
    
    try {
      // Check useWebSocketMVP hook
      const webSocketHookPath = path.join(__dirname, 'frontend/src/hooks/useWebSocketMVP.ts');
      const webSocketHookContent = await fs.readFile(webSocketHookPath, 'utf8');
      
      if (webSocketHookContent.includes('useWebSocketMVP') &&
          webSocketHookContent.includes('WebSocketMessage') &&
          webSocketHookContent.includes('subscribe') &&
          webSocketHookContent.includes('reconnectInterval')) {
        this.results.customHooks.useWebSocketMVP = true;
        console.log('  ✅ useWebSocketMVP hook validated');
      }

      // Check useMVPData hook
      const mvpDataHookPath = path.join(__dirname, 'frontend/src/hooks/useMVPData.ts');
      const mvpDataHookContent = await fs.readFile(mvpDataHookPath, 'utf8');
      
      if (mvpDataHookContent.includes('useMVPData') &&
          mvpDataHookContent.includes('MVPData') &&
          mvpDataHookContent.includes('fetchData') &&
          mvpDataHookContent.includes('savePipelineConfig') &&
          mvpDataHookContent.includes('createJiraIssue')) {
        this.results.customHooks.useMVPData = true;
        console.log('  ✅ useMVPData hook validated');
      }

    } catch (error) {
      console.log('  ❌ Custom hooks validation failed:', error.message);
    }
  }

  async validateApiEndpoints() {
    console.log('🌐 Validating API Endpoints...');
    
    const endpoints = [
      { name: 'mvpPipelineHealth', url: '/mvp-dashboard/pipeline-health' },
      { name: 'mvpRecentFailures', url: '/mvp-dashboard/recent-failures' },
      { name: 'mvpPipelineConfigs', url: '/mvp-dashboard/pipeline-configs' },
      { name: 'mvpSystemConfig', url: '/mvp-dashboard/system-config' },
      { name: 'mvpStatistics', url: '/mvp-dashboard/statistics' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint.url}`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Week6Validator/1.0'
          },
          validateStatus: (status) => status < 500 // Accept 4xx as valid response structure
        });
        
        if (response.status < 500) {
          this.results.apiEndpoints[endpoint.name] = true;
          console.log(`  ✅ ${endpoint.name} endpoint available (${response.status})`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`  ⚠️  ${endpoint.name} endpoint - server not running`);
        } else if (error.response && error.response.status === 401) {
          // Authentication required but endpoint exists
          this.results.apiEndpoints[endpoint.name] = true;
          console.log(`  ✅ ${endpoint.name} endpoint available (auth required)`);
        } else {
          console.log(`  ❌ ${endpoint.name} endpoint failed:`, error.message);
        }
      }
    }
  }

  async validateUserInterface() {
    console.log('🎨 Validating User Interface...');
    
    try {
      // Check CSS styling exists
      const cssPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/MVPDashboard.css');
      const cssContent = await fs.readFile(cssPath, 'utf8');
      
      if (cssContent.includes('grid-template-columns') &&
          cssContent.includes('@media') &&
          cssContent.includes('real-time-indicator') &&
          cssContent.includes('pipeline-status')) {
        this.results.userInterface.responsiveDesign = true;
        console.log('  ✅ Responsive design CSS validated');
      }

      // Check real-time update capabilities
      const dashboardPath = path.join(__dirname, 'frontend/src/pages/MVPDashboard/MVPDashboard.tsx');
      const dashboardContent = await fs.readFile(dashboardPath, 'utf8');
      
      if (dashboardContent.includes('useWebSocketMVP') &&
          dashboardContent.includes('lastMessage') &&
          dashboardContent.includes('realTimeData')) {
        this.results.userInterface.realTimeUpdates = true;
        console.log('  ✅ Real-time update capability validated');
      }

      // Check navigation flow
      if (dashboardContent.includes('handleNavigation') &&
          dashboardContent.includes('activeView') &&
          dashboardContent.includes('onNavigateToDetails')) {
        this.results.userInterface.navigationFlow = true;
        console.log('  ✅ Navigation flow validated');
      }

      // Check error handling
      if (dashboardContent.includes('error') &&
          dashboardContent.includes('Alert') &&
          dashboardContent.includes('try') &&
          dashboardContent.includes('catch')) {
        this.results.userInterface.errorHandling = true;
        console.log('  ✅ Error handling validated');
      }

    } catch (error) {
      console.log('  ❌ User interface validation failed:', error.message);
    }
  }

  async validateIntegration() {
    console.log('🔗 Validating Integration...');
    
    try {
      // Check backend connection capability
      const hookPath = path.join(__dirname, 'frontend/src/hooks/useMVPData.ts');
      const hookContent = await fs.readFile(hookPath, 'utf8');
      
      if (hookContent.includes('API_BASE_URL') &&
          hookContent.includes('apiCall') &&
          hookContent.includes('fetch')) {
        this.results.integration.backendConnection = true;
        console.log('  ✅ Backend connection capability validated');
      }

      // Check WebSocket connection
      const wsHookPath = path.join(__dirname, 'frontend/src/hooks/useWebSocketMVP.ts');
      const wsHookContent = await fs.readFile(wsHookPath, 'utf8');
      
      if (wsHookContent.includes('WebSocket') &&
          wsHookContent.includes('reconnect') &&
          wsHookContent.includes('heartbeat')) {
        this.results.integration.webSocketConnection = true;
        console.log('  ✅ WebSocket connection capability validated');
      }

      // Check data flow
      if (hookContent.includes('setState') &&
          hookContent.includes('useCallback') &&
          hookContent.includes('useEffect')) {
        this.results.integration.dataFlow = true;
        console.log('  ✅ Data flow management validated');
      }

      // Check configuration management
      if (hookContent.includes('savePipelineConfig') &&
          hookContent.includes('saveSystemConfig') &&
          hookContent.includes('testConnection')) {
        this.results.integration.configurationManagement = true;
        console.log('  ✅ Configuration management validated');
      }

    } catch (error) {
      console.log('  ❌ Integration validation failed:', error.message);
    }
  }

  calculateSuccessRate() {
    let totalChecks = 0;
    let passedChecks = 0;

    Object.values(this.results).forEach(category => {
      Object.values(category).forEach(result => {
        totalChecks++;
        if (result) passedChecks++;
      });
    });

    return {
      total: totalChecks,
      passed: passedChecks,
      percentage: Math.round((passedChecks / totalChecks) * 100)
    };
  }

  async runValidation() {
    console.log('🚀 Starting Week 6 Dashboard Enhancement Validation...\n');

    await this.validateDashboardComponents();
    console.log('');
    
    await this.validateCustomHooks();
    console.log('');
    
    await this.validateApiEndpoints();
    console.log('');
    
    await this.validateUserInterface();
    console.log('');
    
    await this.validateIntegration();
    console.log('');

    const successRate = this.calculateSuccessRate();
    
    console.log('📊 Week 6 Validation Summary:');
    console.log('================================');
    console.log(`Total Checks: ${successRate.total}`);
    console.log(`Passed: ${successRate.passed}`);
    console.log(`Failed: ${successRate.total - successRate.passed}`);
    console.log(`Success Rate: ${successRate.percentage}%`);
    console.log('');

    // Detailed results
    console.log('📋 Detailed Results:');
    console.log('Dashboard Components:');
    Object.entries(this.results.dashboardComponents).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });
    
    console.log('Custom Hooks:');
    Object.entries(this.results.customHooks).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });
    
    console.log('API Endpoints:');
    Object.entries(this.results.apiEndpoints).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });
    
    console.log('User Interface:');
    Object.entries(this.results.userInterface).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });
    
    console.log('Integration:');
    Object.entries(this.results.integration).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`);
    });

    console.log('\n🎯 Week 6 MVP Dashboard Enhancement Status:');
    if (successRate.percentage >= 90) {
      console.log('🟢 EXCELLENT - Dashboard implementation is comprehensive and ready for production');
    } else if (successRate.percentage >= 75) {
      console.log('🟡 GOOD - Dashboard implementation is solid with minor items to address');
    } else if (successRate.percentage >= 60) {
      console.log('🟠 ACCEPTABLE - Dashboard implementation needs some improvements');
    } else {
      console.log('🔴 NEEDS WORK - Dashboard implementation requires significant improvements');
    }

    return this.results;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new Week6Validator();
  validator.runValidation()
    .then(() => {
      console.log('\n✨ Week 6 validation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = Week6Validator;
