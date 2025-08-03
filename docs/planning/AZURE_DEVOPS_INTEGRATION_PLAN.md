# Azure DevOps MVP Integration Plan for Test Management Application

*Updated for MVP Focus on August 3, 2025*

## 🎯 **MVP Overview**

This plan outlines the **Minimum Viable Product (MVP)** integration of your Test Management Application with Microsoft Azure DevOps (ADO), specifically focused on **JIRA-ADO integration** for automated test failure management.

**MVP Concept**: Create a seamless bridge between Azure DevOps pipeline failures and JIRA issue creation, building on the existing successful JIRA integration to provide immediate value to development teams.

**Core MVP Value**: When tests fail in Azure DevOps pipelines, automatically create detailed JIRA issues with rich context, eliminating manual triage work and accelerating bug resolution.

The MVP will leverage your existing JIRA integration patterns and Phase 1 foundation infrastructure to provide rapid time-to-value while establishing the architecture for future platform expansion.

## 📋 **MVP Scope Definition**

### **What's IN the MVP**
- ✅ **JIRA Integration** (Already Working)
- 🎯 **ADO Pipeline Monitoring**: Real-time monitoring of selected build definitions
- 🎯 **Test Result Processing**: Automated consumption of ADO test results
- 🎯 **Failure Detection**: Intelligent identification of test failures
- 🎯 **JIRA Issue Creation**: Automatic issue creation with ADO context
- 🎯 **Configuration Management**: Simple setup for ADO-JIRA workflows
- 🎯 **Real-time Dashboard**: Live pipeline health monitoring

### **What's OUT of the MVP**
- ❌ Complex multi-platform integrations (GitHub, GitLab)
- ❌ Advanced analytics and AI features
- ❌ Multi-tenant architecture
- ❌ Complex workflow engines
- ❌ Advanced reporting dashboards
- ❌ Release pipeline integration (focus on builds only)

## 🏗️ **MVP Technical Architecture**

### **Core Data Flow**
```
[ADO Pipeline] → [Build Completion] → [Test Results API] → [Failure Detection]
      ↓               ↓                    ↓                    ↓
[Configuration] → [Real-time WS] → [Result Processing] → [JIRA Issue Creation]
      ↓               ↓                    ↓                    ↓
[Setup UI] ← [Dashboard Updates] ← [Database Storage] ← [Context Enrichment]
```

### **MVP Integration Components**

#### 1. ADO Configuration Service (NEW)
```javascript
// MVP-focused ADO configuration
class MVPADOConfigService {
  async configurePipeline(config) {
    // Simple pipeline configuration for monitoring
    // Store in mvp_pipeline_configs table
    // Validate ADO connection and permissions
    // Start monitoring for the specific build definition
  }

  async validateConnection(adoConfig) {
    // Test ADO API connectivity
    // Verify permissions for build definitions
    // Check access to test results
  }
}
```

#### 2. Pipeline Monitor (NEW)
```javascript
// Real-time pipeline monitoring
class MVPPipelineMonitor {
  async monitorBuildDefinitions() {
    // Poll configured build definitions
    // Detect completed builds
    // Trigger test result processing
    // Send real-time updates via WebSocket
  }

  async processBuildCompletion(buildId) {
    // Fetch test results from ADO
    // Identify failures
    // Trigger JIRA workflow if needed
  }
}
```

#### 3. JIRA-ADO Bridge (NEW)
```javascript
// Bridge ADO failures to JIRA issues
class MVPJiraADOBridge {
  async processTestFailure(failureData) {
    // Enrich failure with ADO context
    // Create JIRA issue using existing integration
    // Store correlation in database
    // Handle duplicate detection
  }

  async enrichWithADOContext(issueData, adoContext) {
    // Add ADO build information to JIRA issue
    // Include pipeline links and metadata
    // Attach relevant logs/artifacts
  }
}
```

## 📅 **MVP Implementation Timeline (5 Weeks)**

### **Week 3: ADO Core Integration**
#### Deliverables:
- Enhanced ADO client with build monitoring capabilities
- Build definition discovery and selection API
- Basic pipeline configuration storage
- Connection testing and validation

#### Tasks:
- Extend existing `lib/ado-client.js` with build monitoring
- Create `services/mvp-ado-config.js` for pipeline configuration
- Add MVP database tables for pipeline configs
- Implement ADO API connectivity testing

#### Acceptance Criteria:
- Users can discover and select ADO build definitions
- Pipeline configurations stored and validated
- Basic connection testing working
- API endpoints for configuration management

### **Week 4: Test Result Processing**
#### Deliverables:
- Real-time build completion detection
- Test result ingestion from ADO APIs
- Failure detection and classification
- Initial JIRA integration for ADO failures

#### Tasks:
- Create `services/mvp-pipeline-monitor.js` for build monitoring
- Implement test result parsing from ADO APIs
- Build failure detection logic
- Initial JIRA issue creation with ADO context

#### Acceptance Criteria:
- Completed builds detected within 5 minutes
- Test results parsed and stored
- Failed tests identified and classified
- Basic JIRA issues created for failures

### **Week 5: JIRA-ADO Workflow Integration**
#### Deliverables:
- Complete JIRA-ADO bridge functionality
- Rich context in JIRA issues from ADO failures
- Duplicate detection and issue updates
- Workflow configuration options

#### Tasks:
- Create `services/mvp-jira-ado-bridge.js`
- Enhance JIRA issues with ADO context and links
- Implement duplicate detection for recurring failures
- Add configurable workflow rules

#### Acceptance Criteria:
- JIRA issues include comprehensive ADO context
- Duplicate failures update existing issues
- ADO build links accessible from JIRA
- Configurable thresholds for issue creation

### **Week 6: Dashboard Enhancement**
#### Deliverables:
- Real-time pipeline health dashboard
- Configuration management interface
- Recent failures and JIRA issue tracking
- WebSocket updates for live monitoring

#### Tasks:
- Create `frontend/src/pages/MVPDashboard/`
- Build pipeline health visualization components
- Implement configuration management UI
- Add real-time WebSocket updates

#### Acceptance Criteria:
- Live dashboard shows pipeline health status
- Users can configure ADO-JIRA workflows via UI
- Recent failures displayed with JIRA links
- Real-time updates when builds complete

### **Week 7: MVP Polish and Validation**
#### Deliverables:
- Complete end-to-end workflow testing
- Performance optimization
- Documentation and setup guides
- User acceptance testing

#### Tasks:
- End-to-end testing with real ADO pipelines
- Performance tuning for realistic loads
- Complete setup documentation
- User feedback integration

#### Acceptance Criteria:
- Complete workflow from setup to JIRA issue creation
- System handles 50+ monitored pipelines
- Setup time under 30 minutes
- Documentation covers all MVP features

## 🔧 **MVP Feature Specifications**

### **Core Features**

#### **1. ADO Pipeline Configuration**
```javascript
// Configuration object for MVP
const pipelineConfig = {
  adoOrganization: 'myorg',
  adoProject: 'MyProject',
  buildDefinitionId: 123,
  buildDefinitionName: 'CI Pipeline',
  jiraProjectKey: 'PROJ',
  jiraIssueType: 'Bug',
  failureThreshold: 'any', // any, multiple, critical
  notificationRules: {
    createIssue: true,
    updateExisting: true,
    notifyTeam: false
  }
};
```

#### **2. Test Failure Processing**
```javascript
// MVP failure data structure
const testFailure = {
  buildId: 12345,
  buildDefinitionId: 123,
  testName: 'LoginTests.ShouldAuthenticateUser',
  testOutcome: 'Failed',
  errorMessage: 'Expected element not found',
  stackTrace: '...',
  testRunId: 567,
  buildUrl: 'https://dev.azure.com/org/project/_build/results?buildId=12345',
  testUrl: 'https://dev.azure.com/org/project/_TestManagement/Runs?runId=567',
  artifacts: ['screenshot.png', 'console.log'],
  buildReason: 'PullRequest',
  sourceBranch: 'feature/new-login',
  timestamp: '2025-08-03T10:30:00Z'
};
```

#### **3. JIRA Issue Enhancement**
```javascript
// JIRA issue with ADO context
const jiraIssueWithADO = {
  summary: '[ADO] Test Failure: LoginTests.ShouldAuthenticateUser',
  description: `
Test failed in Azure DevOps pipeline:

*Build Information:*
- Pipeline: CI Pipeline (#123)
- Build: #12345
- Branch: feature/new-login
- Build Reason: Pull Request

*Test Details:*
- Test: LoginTests.ShouldAuthenticateUser
- Outcome: Failed
- Error: Expected element not found

*Links:*
- [View Build|https://dev.azure.com/org/project/_build/results?buildId=12345]
- [View Test Results|https://dev.azure.com/org/project/_TestManagement/Runs?runId=567]

*Stack Trace:*
{code}
...stack trace here...
{code}
  `,
  labels: ['ado-failure', 'automated-test', 'ci-pipeline'],
  components: ['UI', 'Authentication'],
  customFields: {
    'ADO Build ID': '12345',
    'ADO Pipeline': 'CI Pipeline',
    'Test Name': 'LoginTests.ShouldAuthenticateUser'
  }
};
```

### **Dashboard Features**

#### **Pipeline Health Overview**
- Real-time status grid of all configured pipelines
- Color-coded health indicators (green/yellow/red)
- Last build information and timestamps
- Quick access to recent JIRA issues

#### **Recent Failures Panel**
- List of latest test failures across all pipelines
- Direct links to created JIRA issues
- Failure categorization and trending
- Quick actions for issue management

#### **Configuration Management**
- Add/edit/remove pipeline configurations
- Test ADO connections and permissions
- Configure JIRA field mappings
- Set notification and workflow rules

## 🎯 **MVP Success Criteria**

### **Technical Metrics**
- **Setup Time**: <30 minutes to configure first ADO-JIRA integration
- **Detection Latency**: <5 minutes from build failure to JIRA issue creation
- **System Reliability**: >99% uptime during business hours
- **API Performance**: <2 seconds for dashboard updates
- **Correlation Accuracy**: >95% accurate test failure to JIRA issue mapping

### **User Experience Goals**
- **Zero Manual Triage**: Automatic JIRA issues for all test failures
- **Rich Context**: JIRA issues contain all necessary debugging information
- **Live Visibility**: Real-time pipeline health monitoring
- **Simple Configuration**: Non-technical users can set up integrations
- **Reliable Operation**: Consistent performance under normal loads

### **Business Value Targets**
- **Time Savings**: 80% reduction in manual test failure processing
- **Issue Quality**: Faster bug resolution with automated context
- **Team Productivity**: Reduced context switching between tools
- **Defect Tracking**: 100% test failures tracked in JIRA

## 🔐 **MVP Security & Authentication**

### **ADO Authentication**
```javascript
// MVP ADO authentication config
const adoAuthConfig = {
  personalAccessToken: process.env.ADO_PAT,
  organization: process.env.ADO_ORGANIZATION,
  project: process.env.ADO_PROJECT,
  permissions: [
    'Build (read)',
    'Test Management (read)',
    'Code (read)', // for source links
  ]
};
```

### **Security Best Practices**
- PAT tokens stored securely in environment variables
- Minimal required permissions for ADO access
- HTTPS-only API communications
- Input validation for all configuration data
- Audit logging for configuration changes

## 📊 **MVP Database Schema**

```sql
-- MVP-specific pipeline configuration
CREATE TABLE mvp_pipeline_configs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    ado_organization TEXT NOT NULL,
    ado_project TEXT NOT NULL,
    build_definition_id INTEGER NOT NULL,
    build_definition_name TEXT NOT NULL,
    jira_project_key TEXT NOT NULL,
    jira_issue_type TEXT DEFAULT 'Bug',
    failure_threshold TEXT DEFAULT 'any',
    notification_rules JSON,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Test failure tracking and JIRA correlation
CREATE TABLE mvp_test_failures (
    id INTEGER PRIMARY KEY,
    pipeline_config_id INTEGER,
    build_id INTEGER NOT NULL,
    build_definition_id INTEGER NOT NULL,
    test_run_id INTEGER,
    test_name TEXT NOT NULL,
    test_outcome TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    build_url TEXT,
    test_url TEXT,
    source_branch TEXT,
    build_reason TEXT,
    jira_issue_key TEXT,
    correlation_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_config_id) REFERENCES mvp_pipeline_configs(id)
);

-- JIRA-ADO correlation tracking
CREATE TABLE mvp_jira_ado_correlations (
    id INTEGER PRIMARY KEY,
    jira_issue_key TEXT NOT NULL,
    ado_build_id INTEGER NOT NULL,
    ado_test_run_id INTEGER,
    test_failure_id INTEGER,
    correlation_type TEXT DEFAULT 'failure',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_failure_id) REFERENCES mvp_test_failures(id)
);
```

## 🚀 **MVP Post-Launch Evolution**

### **Immediate Enhancements (Weeks 8-10)**
- **Performance Optimization**: Caching and batch processing
- **User Feedback Integration**: UI/UX improvements based on usage
- **Additional Configuration Options**: More granular workflow control
- **Enhanced Error Handling**: Better resilience and recovery

### **Phase 2 Features (Weeks 11-14)**
- **GitHub Actions Integration**: Extend pattern to GitHub workflows
- **Advanced Filtering**: Smart failure categorization and routing
- **Trend Analysis**: Basic analytics on failure patterns
- **Team Notifications**: Slack/Teams integration for failure alerts

### **Platform Expansion (Weeks 15-18)**
- **GitLab CI Support**: Third platform integration
- **Advanced Analytics**: ML-powered failure analysis
- **Custom Workflows**: User-defined automation rules
- **Enterprise Features**: SSO, RBAC, compliance

## 📝 **MVP Implementation Checklist**

### **Week 3: Foundation**
- [ ] Extend ADO client for build monitoring
- [ ] Create MVP configuration service
- [ ] Add MVP database tables
- [ ] Implement connection testing
- [ ] Build configuration API endpoints

### **Week 4: Processing**
- [ ] Create pipeline monitoring service
- [ ] Implement test result ingestion
- [ ] Build failure detection logic
- [ ] Create basic JIRA integration

### **Week 5: Integration**
- [ ] Complete JIRA-ADO bridge service
- [ ] Enhance JIRA issues with ADO context
- [ ] Implement duplicate detection
- [ ] Add workflow configuration

### **Week 6: Dashboard**
- [ ] Build MVP dashboard components
- [ ] Create configuration management UI
- [ ] Implement real-time updates
- [ ] Add pipeline health visualization

### **Week 7: Polish**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Complete documentation
- [ ] User acceptance testing

## 🎯 **Conclusion**

This MVP-focused Azure DevOps integration plan builds on the existing JIRA integration success to deliver immediate value through automated test failure management. By concentrating on the core JIRA-ADO workflow, we can validate market demand while establishing the foundation for a comprehensive test management platform.

**Key MVP Benefits:**
- **Immediate Value**: Working integration in 5 weeks
- **Proven Patterns**: Built on successful JIRA integration
- **Clear ROI**: Measurable time savings and productivity gains
- **Scalable Foundation**: Ready for future platform expansion

*Focus on delivering exceptional JIRA-ADO integration, and the broader platform vision will follow naturally.*
  "buildNumber": "20250802.1",
  "status": "completed",
  "result": "succeeded|failed|partiallySucceeded",
  "startTime": "2025-08-02T10:00:00Z",
  "finishTime": "2025-08-02T10:15:00Z",
  "repository": {
    "name": "MyProject",
    "id": "repo-guid"
  },
  "sourceBranch": "refs/heads/main",
  "definition": {
    "name": "CI Pipeline",
    "id": 42
  },
  "testResults": {
    "totalCount": 150,
    "passedCount": 145,
    "failedCount": 5,
    "notExecutedCount": 0
  }
}
```

#### **Pipeline Discovery and Management**
```javascript
// ADO Build Definition (Pipeline) Structure
{
  "id": 42,
  "name": "CI Pipeline",
  "path": "\\MyProject\\CI",
  "repository": {
    "name": "my-repo",
    "type": "TfsGit"
  },
  "process": {
    "type": "yamlFilename",
    "yamlFilename": "azure-pipelines.yml"
  },
  "triggers": [
    {
      "triggerType": "continuousIntegration",
      "branchFilters": ["+refs/heads/main"]
    }
  ]
}
```

#### **Project Configuration System**
```javascript
// Service to manage project configurations for Build Definitions
class AdoProjectConfigurationService {
  async configureProject(buildDefinitionId, projectConfig) {
    // Validate build definition exists
    const buildDefinition = await this.getBuildDefinitionDetails(buildDefinitionId);
    
    // Create project configuration
    const projectData = {
      id: generateProjectId(buildDefinitionId),
      name: projectConfig.name || buildDefinition.name,
      buildDefinitionId: buildDefinitionId,
      adoProjectId: buildDefinition.project.id,
      adoProjectName: buildDefinition.project.name,
      repository: buildDefinition.repository,
      path: buildDefinition.path,
      enabled: true,
      configuration: {
        trackBranches: projectConfig.trackBranches || ['main', 'master'],
        healthThresholds: projectConfig.healthThresholds || {
          healthy: 90,
          warning: 75,
          critical: 50
        },
        notifications: projectConfig.notifications || {
          onFailure: true,
          onSuccess: false,
          channels: []
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store in database
    await this.storeProjectConfiguration(projectData);
    
    return projectData;
  }
  
  async getConfiguredProjects() {
    return await this.db.all(`
      SELECT * FROM project_configurations WHERE enabled = 1
    `);
  }
  
  async updateProjectConfiguration(projectId, updates) {
    const existing = await this.getProjectConfiguration(projectId);
    if (!existing) {
      throw new Error(`Project configuration not found: ${projectId}`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.db.run(`
      UPDATE project_configurations 
      SET name = ?, configuration = ?, updated_at = ?
      WHERE id = ?
    `, [updated.name, JSON.stringify(updated.configuration), updated.updatedAt, projectId]);
    
    return updated;
  }
}
```

#### **Test Result Consumption Service**
```javascript
// Service to consume and process ADO test results
class AdoTestResultConsumer {
  async processBuildResults(buildId) {
    const testRuns = await this.getTestRunsForBuild(buildId);
    const testResults = await this.getTestResultsForRuns(testRuns);
    
    // Store in local database for reporting
    await this.storeTestResults(testResults);
    
    // Update pipeline status (treating pipeline as project)
    await this.updatePipelineStatus(testResults);
    
    // Emit real-time updates
    this.emitStatusUpdate(testResults);
  }
}
```

#### **Pipeline Status Aggregation**
- **Pipeline-level health metrics**: Overall pass/fail rates by pipeline
- **Trend analysis**: Success rate trends over time per pipeline
- **Environment-specific results**: Dev, staging, production pipeline results
- **Branch-based reporting**: Feature branch vs main branch success rates

### **3. Project-Based Reporting System**

#### **Project Dashboard Components**
```javascript
// Project Status Data Structure
{
  "projectId": "MyProject",
  "projectName": "E-commerce Platform",
  "lastUpdated": "2025-08-02T14:30:00Z",
  "overallHealth": "healthy|warning|critical",
  "metrics": {
    "successRate": 96.7,
    "totalTests": 450,
    "passedTests": 435,
    "failedTests": 15,
    "averageDuration": "12m 30s",
    "trendsLast30Days": {
      "successRateTrend": "+2.3%",
      "performanceTrend": "-1.2%",
      "stabilityScore": 8.5
    }
  },
  "environments": {
    "development": { "health": "healthy", "lastRun": "2025-08-02T14:00:00Z" },
    "staging": { "health": "warning", "lastRun": "2025-08-02T13:45:00Z" },
    "production": { "health": "healthy", "lastRun": "2025-08-02T10:30:00Z" }
  },
  "recentBuilds": [
    {
      "buildId": 12345,
      "branch": "main",
      "result": "succeeded",
      "testSummary": { "total": 450, "passed": 435, "failed": 15 }
    }
  ]
}
```

#### **Automated Report Generation**
- **Daily Status Reports**: Automated project health summaries
- **Weekly Trend Reports**: Performance and reliability trends
- **Monthly Executive Summaries**: High-level project metrics
- **Custom Report Builder**: User-defined report criteria and scheduling

#### **Real-time Status Updates**
- **Live Project Dashboards**: Real-time project health monitoring
- **Alert System**: Configurable thresholds for critical failures
- **Notification Integration**: Teams, Slack, email notifications
- **Mobile-friendly Views**: Responsive dashboard design

### **4. CI/CD Pipeline Integration**

#### **Pipeline Triggers**
- **Webhook Endpoints**: Receive pipeline completion notifications
- **Automated Data Ingestion**: Process test results on build completion
- **Real-time Updates**: Stream pipeline status changes to dashboard
- **Historical Data Collection**: Archive pipeline results for trend analysis

#### **Pipeline Extensions**
```yaml
# Azure Pipeline Extension Task
- task: TestManagementApp@1
  displayName: 'Run Test Management App Tests'
  inputs:
    endpoint: '$(TEST_MANAGEMENT_ENDPOINT)'
    apiKey: '$(TEST_MANAGEMENT_API_KEY)'
    testSuite: 'regression'
    environment: '$(Build.SourceBranchName)'
    publishResults: true
    createWorkItems: true
```

## 🛠 **Implementation Plan - Pipeline Result Consumption Focus**

### **Phase 1: Pipeline Data Ingestion (1-2 weeks)**

#### **Week 1: ADO Build API Integration**

1. **Build Result Consumer Service**
   ```javascript
   // services/ado-build-consumer.js
   class AdoBuildConsumer {
     constructor(adoClient, database) {
       this.client = adoClient;
       this.db = database;
     }
     
     async consumeBuildResults(buildId) {
       // Get build details from ADO
       const build = await this.getBuildDetails(buildId);
       
       // Get test results for this build
       const testRuns = await this.getTestRunsForBuild(buildId);
       const testResults = await this.aggregateTestResults(testRuns);
       
       // Store in local database
       await this.storeBuildResults(build, testResults);
       
       // Update project metrics
       await this.updateProjectMetrics(build.project.id, testResults);
       
       return { build, testResults };
     }
     
     async getBuildDetails(buildId) {
       const buildApi = await this.client.getBuildApi();
       return await buildApi.getBuild(this.client.projectId, buildId);
     }
     
     async getTestRunsForBuild(buildId) {
       const testApi = await this.client.getTestApi();
       return await testApi.getTestRuns(this.client.projectId, buildId);
     }
   }
   ```

2. **Database Schema for ADO Data**
   ```sql
   -- ADO Builds table
   CREATE TABLE ado_builds (
     id INTEGER PRIMARY KEY,
     ado_build_id INTEGER UNIQUE,
     ado_project_id TEXT,
     build_definition_id INTEGER,
     build_number TEXT,
     status TEXT,
     result TEXT,
     start_time DATETIME,
     finish_time DATETIME,
     source_branch TEXT,
     repository_name TEXT,
     definition_name TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- ADO Test Results table
   CREATE TABLE ado_test_results (
     id INTEGER PRIMARY KEY,
     ado_build_id INTEGER,
     test_run_id INTEGER,
     total_tests INTEGER,
     passed_tests INTEGER,
     failed_tests INTEGER,
     skipped_tests INTEGER,
     duration_ms INTEGER,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (ado_build_id) REFERENCES ado_builds(ado_build_id)
   );
   
   -- Project Configurations table (NEW)
   CREATE TABLE project_configurations (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     build_definition_id INTEGER UNIQUE,
     ado_project_id TEXT,
     ado_project_name TEXT,
     repository_name TEXT,
     repository_type TEXT,
     path TEXT,
     enabled BOOLEAN DEFAULT 1,
     configuration TEXT, -- JSON configuration
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Project Status Summary table (UPDATED)
   CREATE TABLE project_status (
     id INTEGER PRIMARY KEY,
     project_id TEXT UNIQUE,
     project_name TEXT,
     build_definition_id INTEGER,
     last_build_id INTEGER,
     overall_health TEXT,
     success_rate REAL,
     total_tests INTEGER,
     last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (project_id) REFERENCES project_configurations(id)
   );
   ```

#### **Week 2: Webhook Integration**

3. **ADO Webhook Handler for Build Completion**
   ```javascript
   // routes/ado-webhooks.js
   const express = require('express');
   const crypto = require('crypto');
   const AdoBuildConsumer = require('../services/ado-build-consumer');
   
   const router = express.Router();
   
   // Webhook for build completion
   router.post('/build-complete', async (req, res) => {
     try {
       // Validate webhook signature
       if (!validateWebhookSignature(req)) {
         return res.status(401).json({ error: 'Invalid signature' });
       }
       
       const { eventType, resource } = req.body;
       
       if (eventType === 'build.complete') {
         const buildId = resource.id;
         const projectId = resource.project.id;
         
         // Consume build results asynchronously
         setImmediate(async () => {
           try {
             const consumer = new AdoBuildConsumer(adoClient, database);
             const results = await consumer.consumeBuildResults(buildId);
             
             // Emit real-time update
             io.emit('ado:build-complete', {
               projectId,
               buildId,
               result: resource.result,
               testSummary: results.testResults
             });
             
             console.log(`✅ Processed build ${buildId} for project ${projectId}`);
           } catch (error) {
             console.error(`❌ Failed to process build ${buildId}:`, error);
           }
         });
         
         res.status(200).json({ status: 'accepted' });
       } else {
         res.status(200).json({ status: 'ignored' });
       }
     } catch (error) {
       console.error('Webhook processing error:', error);
       res.status(500).json({ error: 'Processing failed' });
     }
   });
   
   function validateWebhookSignature(req) {
     const signature = req.headers['x-vss-signature'];
     const secret = process.env.ADO_WEBHOOK_SECRET;
     
     if (!signature || !secret) return false;
     
     const hmac = crypto.createHmac('sha1', secret);
     hmac.update(JSON.stringify(req.body));
     const expectedSignature = 'sha1=' + hmac.digest('hex');
     
     return crypto.timingSafeEqual(
       Buffer.from(signature),
       Buffer.from(expectedSignature)
     );
   }
   
   module.exports = router;
   ```

### **Phase 2: Project Configuration & Status Reporting (1-2 weeks)**

#### **Week 3: Project Configuration Interface**

4. **Project Configuration API Endpoints**
   ```javascript
   // routes/ado-project-config.js
   const express = require('express');
   const AdoBuildDefinitionService = require('../services/ado-build-definition');
   const AdoProjectConfigurationService = require('../services/ado-project-configuration');
   
   const router = express.Router();
   
   // Get available build definitions for configuration
   router.get('/build-definitions', async (req, res) => {
     try {
       const { search, projectId } = req.query;
       const buildDefService = new AdoBuildDefinitionService(adoClient);
       
       let definitions = await buildDefService.getBuildDefinitions(projectId);
       
       // Filter by search term if provided
       if (search) {
         definitions = definitions.filter(def => 
           def.name.toLowerCase().includes(search.toLowerCase()) ||
           def.path.toLowerCase().includes(search.toLowerCase())
         );
       }
       
       // Check which definitions are already configured
       const configService = new AdoProjectConfigurationService(database);
       const configuredIds = await configService.getConfiguredBuildDefinitionIds();
       
       const enrichedDefinitions = definitions.map(def => ({
         ...def,
         isConfigured: configuredIds.includes(def.id),
         lastBuildStatus: def.lastBuild?.result || 'unknown'
       }));
       
       res.json(enrichedDefinitions);
     } catch (error) {
       console.error('Error fetching build definitions:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Create a new project configuration
   router.post('/projects', async (req, res) => {
     try {
       const { buildDefinitionId, projectConfig } = req.body;
       
       if (!buildDefinitionId) {
         return res.status(400).json({ error: 'buildDefinitionId is required' });
       }
       
       const configService = new AdoProjectConfigurationService(database);
       const project = await configService.configureProject(buildDefinitionId, projectConfig);
       
       res.status(201).json(project);
     } catch (error) {
       console.error('Error creating project configuration:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Get all configured projects
   router.get('/projects', async (req, res) => {
     try {
       const configService = new AdoProjectConfigurationService(database);
       const projects = await configService.getConfiguredProjects();
       
       res.json(projects);
     } catch (error) {
       console.error('Error fetching configured projects:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Update project configuration
   router.put('/projects/:projectId', async (req, res) => {
     try {
       const { projectId } = req.params;
       const updates = req.body;
       
       const configService = new AdoProjectConfigurationService(database);
       const updatedProject = await configService.updateProjectConfiguration(projectId, updates);
       
       res.json(updatedProject);
     } catch (error) {
       console.error('Error updating project configuration:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Delete project configuration
   router.delete('/projects/:projectId', async (req, res) => {
     try {
       const { projectId } = req.params;
       
       const configService = new AdoProjectConfigurationService(database);
       await configService.deleteProjectConfiguration(projectId);
       
       res.status(204).send();
     } catch (error) {
       console.error('Error deleting project configuration:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   module.exports = router;
   ```

5. **Settings Page Integration - ADO Configuration Tab**
   ```jsx
   // frontend/src/components/settings/AdoSettingsTab.jsx
   import React, { useState, useEffect } from 'react';
   import { 
     Card, 
     Table, 
     Button, 
     Modal, 
     Form, 
     Input, 
     Select, 
     Switch, 
     InputNumber,
     Space,
     Tag,
     Tooltip,
     message,
     Steps,
     Divider,
     Alert
   } from 'antd';
   import { PlusOutlined, SettingOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
   
   const { Option } = Select;
   const { Step } = Steps;
   
   function AdoSettingsTab() {
     const [connectionStatus, setConnectionStatus] = useState('unconfigured'); // unconfigured, testing, connected, error
     const [buildDefinitions, setBuildDefinitions] = useState([]);
     const [configuredProjects, setConfiguredProjects] = useState([]);
     const [showConfigModal, setShowConfigModal] = useState(false);
     const [selectedDefinition, setSelectedDefinition] = useState(null);
     const [searchTerm, setSearchTerm] = useState('');
     const [loading, setLoading] = useState(false);
     const [currentStep, setCurrentStep] = useState(0);
     const [adoConfig, setAdoConfig] = useState({
       organization: '',
       project: '',
       pat: ''
     });
     const [form] = Form.useForm();
     const [configForm] = Form.useForm();
   
     useEffect(() => {
       fetchAdoConfiguration();
       if (connectionStatus === 'connected') {
         fetchBuildDefinitions();
         fetchConfiguredProjects();
       }
     }, [connectionStatus]);
   
     const fetchAdoConfiguration = async () => {
       try {
         const response = await fetch('/api/ado/configuration');
         if (response.ok) {
           const config = await response.json();
           setAdoConfig(config);
           setConnectionStatus(config.isConnected ? 'connected' : 'unconfigured');
           if (config.isConnected) {
             setCurrentStep(1);
           }
         }
       } catch (error) {
         console.error('Failed to fetch ADO configuration:', error);
       }
     };
   
     const testAdoConnection = async (values) => {
       try {
         setConnectionStatus('testing');
         const response = await fetch('/api/ado/test-connection', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(values)
         });
         
         const result = await response.json();
         if (result.success) {
           setConnectionStatus('connected');
           setAdoConfig(values);
           setCurrentStep(1);
           message.success('Azure DevOps connection successful!');
           
           // Save configuration
           await saveAdoConfiguration(values);
         } else {
           setConnectionStatus('error');
           message.error(`Connection failed: ${result.error}`);
         }
       } catch (error) {
         setConnectionStatus('error');
         message.error('Failed to test connection');
       }
     };
   
     const saveAdoConfiguration = async (config) => {
       try {
         await fetch('/api/ado/configuration', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(config)
         });
       } catch (error) {
         console.error('Failed to save configuration:', error);
       }
     };
   
     const fetchBuildDefinitions = async () => {
       try {
         setLoading(true);
         const response = await fetch(`/api/ado/build-definitions?search=${searchTerm}`);
         const data = await response.json();
         setBuildDefinitions(data);
       } catch (error) {
         message.error('Failed to fetch build definitions');
       } finally {
         setLoading(false);
       }
     };
   
     const fetchConfiguredProjects = async () => {
       try {
         const response = await fetch('/api/ado/projects');
         const data = await response.json();
         setConfiguredProjects(data);
       } catch (error) {
         message.error('Failed to fetch configured projects');
       }
     };
   
     const handleConfigureProject = (definition) => {
       setSelectedDefinition(definition);
       form.setFieldsValue({
         name: definition.name,
         trackBranches: ['main', 'master'],
         healthThresholds: {
           healthy: 90,
           warning: 75,
           critical: 50
         },
         notifications: {
           onFailure: true,
           onSuccess: false
         }
       });
       setShowConfigModal(true);
     };
   
     const handleSaveConfiguration = async (values) => {
       try {
         const response = await fetch('/api/ado/projects', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             buildDefinitionId: selectedDefinition.id,
             projectConfig: values
           })
         });
   
         if (response.ok) {
           message.success('Project configured successfully');
           setShowConfigModal(false);
           form.resetFields();
           fetchBuildDefinitions();
           fetchConfiguredProjects();
         } else {
           throw new Error('Failed to configure project');
         }
       } catch (error) {
         message.error(error.message);
       }
     };
   
     const buildDefinitionColumns = [
       {
         title: 'Pipeline Name',
         dataIndex: 'name',
         key: 'name',
         render: (text, record) => (
           <div>
             <div style={{ fontWeight: 'bold' }}>{text}</div>
             <div style={{ fontSize: '12px', color: '#666' }}>{record.path}</div>
           </div>
         ),
       },
       {
         title: 'Repository',
         dataIndex: ['repository', 'name'],
         key: 'repository',
       },
       {
         title: 'Last Build',
         dataIndex: 'lastBuildStatus',
         key: 'lastBuildStatus',
         render: (status) => {
           const color = status === 'succeeded' ? 'green' : 
                        status === 'failed' ? 'red' : 'default';
           return <Tag color={color}>{status}</Tag>;
         },
       },
       {
         title: 'Status',
         dataIndex: 'isConfigured',
         key: 'isConfigured',
         render: (isConfigured) => (
           <Tag color={isConfigured ? 'blue' : 'default'}>
             {isConfigured ? 'Configured' : 'Available'}
           </Tag>
         ),
       },
       {
         title: 'Actions',
         key: 'actions',
         render: (_, record) => (
           <Space>
             {!record.isConfigured ? (
               <Button 
                 type="primary" 
                 size="small"
                 icon={<PlusOutlined />}
                 onClick={() => handleConfigureProject(record)}
               >
                 Configure
               </Button>
             ) : (
               <Tooltip title="Already configured">
                 <Button 
                   size="small"
                   icon={<SettingOutlined />}
                   disabled
                 >
                   Configured
                 </Button>
               </Tooltip>
             )}
           </Space>
         ),
       },
     ];
   
     const configuredProjectColumns = [
       {
         title: 'Project Name',
         dataIndex: 'name',
         key: 'name',
       },
       {
         title: 'Build Definition',
         dataIndex: 'buildDefinitionId',
         key: 'buildDefinitionId',
       },
       {
         title: 'Repository',
         dataIndex: 'repository_name',
         key: 'repository_name',
       },
       {
         title: 'Status',
         dataIndex: 'enabled',
         key: 'enabled',
         render: (enabled) => (
           <Tag color={enabled ? 'green' : 'red'}>
             {enabled ? 'Active' : 'Disabled'}
           </Tag>
         ),
       },
       {
         title: 'Actions',
         key: 'actions',
         render: (_, record) => (
           <Space>
             <Button 
               size="small"
               icon={<SettingOutlined />}
               onClick={() => handleEditProject(record)}
             >
               Edit
             </Button>
             <Button 
               size="small"
               danger
               icon={<DeleteOutlined />}
               onClick={() => handleDeleteProject(record.id)}
             >
               Delete
             </Button>
           </Space>
         ),
       },
     ];
   
     return (
       <div style={{ padding: 24 }}>
         {/* Setup Progress Steps */}
         <Card style={{ marginBottom: 24 }}>
           <Steps current={currentStep} style={{ marginBottom: 24 }}>
             <Step 
               title="Connect to Azure DevOps" 
               description="Configure your Azure DevOps connection"
               icon={connectionStatus === 'connected' ? <CheckCircleOutlined /> : undefined}
             />
             <Step 
               title="Select Pipelines" 
               description="Choose which pipelines to monitor"
               disabled={connectionStatus !== 'connected'}
             />
             <Step 
               title="Monitor Projects" 
               description="View your project dashboards"
               disabled={configuredProjects.length === 0}
             />
           </Steps>
         </Card>
   
         {/* Step 1: Azure DevOps Connection */}
         {currentStep === 0 && (
           <Card title="🔗 Connect to Azure DevOps" style={{ marginBottom: 24 }}>
             <Alert
               message="Quick Setup"
               description="Enter your Azure DevOps organization details to get started. You'll need a Personal Access Token with Build and Test permissions."
               type="info"
               showIcon
               style={{ marginBottom: 24 }}
             />
             
             <Form
               form={configForm}
               layout="vertical"
               onFinish={testAdoConnection}
               initialValues={adoConfig}
             >
               <Form.Item
                 name="organization"
                 label="Azure DevOps Organization URL"
                 rules={[
                   { required: true, message: 'Please enter your organization URL' },
                   { type: 'url', message: 'Please enter a valid URL' }
                 ]}
                 extra="Example: https://dev.azure.com/yourorganization"
               >
                 <Input placeholder="https://dev.azure.com/yourorganization" />
               </Form.Item>
   
               <Form.Item
                 name="project"
                 label="Default Project Name"
                 rules={[{ required: true, message: 'Please enter your project name' }]}
                 extra="The main Azure DevOps project containing your pipelines"
               >
                 <Input placeholder="MyProject" />
               </Form.Item>
   
               <Form.Item
                 name="pat"
                 label="Personal Access Token"
                 rules={[{ required: true, message: 'Please enter your PAT' }]}
                 extra={
                   <div>
                     Required scopes: Build (Read), Test Management (Read), Code (Read). 
                     <a href="https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate" target="_blank" rel="noopener noreferrer">
                       How to create a PAT →
                     </a>
                   </div>
                 }
               >
                 <Input.Password placeholder="Enter your Personal Access Token" />
               </Form.Item>
   
               <Form.Item>
                 <Button 
                   type="primary" 
                   htmlType="submit" 
                   loading={connectionStatus === 'testing'}
                   size="large"
                 >
                   {connectionStatus === 'testing' ? 'Testing Connection...' : 'Connect to Azure DevOps'}
                 </Button>
               </Form.Item>
             </Form>
           </Card>
         )}
   
         {/* Step 2: Pipeline Selection (Simplified) */}
         {currentStep >= 1 && connectionStatus === 'connected' && (
           <>
             <Card 
               title="📊 Select Pipelines to Monitor" 
               extra={
                 <Input.Search
                   placeholder="Search pipelines..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onSearch={fetchBuildDefinitions}
                   style={{ width: 300 }}
                 />
               }
               style={{ marginBottom: 24 }}
             >
               <Alert
                 message="Simple Pipeline Selection"
                 description="Choose which Azure DevOps pipelines you want to monitor as projects. Each pipeline becomes a project in your dashboard."
                 type="info"
                 showIcon
                 style={{ marginBottom: 16 }}
               />
               
               <Table
                 columns={[
                   {
                     title: 'Pipeline',
                     dataIndex: 'name',
                     key: 'name',
                     render: (text, record) => (
                       <div>
                         <div style={{ fontWeight: 'bold' }}>{text}</div>
                         <div style={{ fontSize: '12px', color: '#666' }}>
                           {record.repository?.name} • {record.path}
                         </div>
                       </div>
                     ),
                   },
                   {
                     title: 'Status',
                     dataIndex: 'lastBuildStatus',
                     key: 'status',
                     width: 120,
                     render: (status) => {
                       const color = status === 'succeeded' ? 'green' : 
                                    status === 'failed' ? 'red' : 'default';
                       return <Tag color={color}>{status || 'No builds'}</Tag>;
                     },
                   },
                   {
                     title: 'Monitoring',
                     dataIndex: 'isConfigured',
                     key: 'monitoring',
                     width: 120,
                     render: (isConfigured) => (
                       <Tag color={isConfigured ? 'blue' : 'default'}>
                         {isConfigured ? 'Active' : 'Available'}
                       </Tag>
                     ),
                   },
                   {
                     title: 'Action',
                     key: 'action',
                     width: 100,
                     render: (_, record) => (
                       !record.isConfigured ? (
                         <Button 
                           type="primary" 
                           size="small"
                           onClick={() => handleQuickSetup(record)}
                         >
                           Monitor
                         </Button>
                       ) : (
                         <Button 
                           size="small"
                           onClick={() => handleEditProject(record)}
                         >
                           Settings
                         </Button>
                       )
                     ),
                   },
                 ]}
                 dataSource={buildDefinitions}
                 rowKey="id"
                 loading={loading}
                 pagination={{ pageSize: 8, showSizeChanger: false }}
                 size="small"
               />
             </Card>
   
             {/* Configured Projects Summary */}
             {configuredProjects.length > 0 && (
               <Card title="✅ Active Project Monitoring">
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                   {configuredProjects.map(project => (
                     <Tag 
                       key={project.id}
                       color="blue"
                       style={{ padding: '4px 8px', fontSize: '13px' }}
                     >
                       {project.name}
                     </Tag>
                   ))}
                 </div>
                 <Divider />
                 <Button 
                   type="primary"
                   onClick={() => setCurrentStep(2)}
                   style={{ marginTop: 16 }}
                 >
                   View Project Dashboards →
                 </Button>
               </Card>
             )}
           </>
         )}
   
         {/* Quick Setup Modal (Simplified) */}
         <Modal
           title={`🚀 Quick Setup: ${selectedDefinition?.name}`}
           open={showConfigModal}
           onCancel={() => setShowConfigModal(false)}
           onOk={() => form.submit()}
           width={500}
         >
           <Alert
             message="Simple Configuration"
             description="Basic settings to get started quickly. You can customize these later."
             type="info"
             showIcon
             style={{ marginBottom: 16 }}
           />
           
           <Form
             form={form}
             layout="vertical"
             onFinish={handleSaveConfiguration}
           >
             <Form.Item
               name="name"
               label="Project Display Name"
               rules={[{ required: true, message: 'Please enter a project name' }]}
             >
               <Input placeholder="Enter a friendly name for this project" />
             </Form.Item>
   
             <Form.Item
               name="trackBranches"
               label="Branches to Monitor"
               initialValue={['main']}
             >
               <Select mode="tags" placeholder="main, master, develop">
                 <Option value="main">main</Option>
                 <Option value="master">master</Option>
                 <Option value="develop">develop</Option>
               </Select>
             </Form.Item>
   
             <Form.Item label="Success Rate Thresholds">
               <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                 <span style={{ minWidth: 60 }}>Healthy:</span>
                 <Form.Item
                   name={['healthThresholds', 'healthy']}
                   initialValue={90}
                   style={{ flex: 1, margin: 0 }}
                 >
                   <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                 </Form.Item>
               </div>
               <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                 <span style={{ minWidth: 60 }}>Warning:</span>
                 <Form.Item
                   name={['healthThresholds', 'warning']}
                   initialValue={75}
                   style={{ flex: 1, margin: 0 }}
                 >
                   <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                 </Form.Item>
               </div>
             </Form.Item>
   
             <Form.Item label="Notifications" style={{ marginBottom: 0 }}>
               <Form.Item
                 name={['notifications', 'onFailure']}
                 valuePropName="checked"
                 initialValue={true}
                 style={{ display: 'inline-block', width: '50%' }}
               >
                 <Switch checkedChildren="On Failure" unCheckedChildren="Off" />
               </Form.Item>
               <Form.Item
                 name={['notifications', 'onSuccess']}
                 valuePropName="checked"
                 initialValue={false}
                 style={{ display: 'inline-block', width: '50%' }}
               >
                 <Switch checkedChildren="On Success" unCheckedChildren="Off" />
               </Form.Item>
             </Form.Item>
           </Form>
         </Modal>
       </div>
     );
   }
   
   // Quick setup handler for one-click configuration
   const handleQuickSetup = (definition) => {
     setSelectedDefinition(definition);
     form.setFieldsValue({
       name: definition.name,
       trackBranches: ['main'],
       healthThresholds: { healthy: 90, warning: 75, critical: 50 },
       notifications: { onFailure: true, onSuccess: false }
     });
     setShowConfigModal(true);
   };
   
   export default AdoSettingsTab;
   ```

#### **Week 4: Project Dashboard API (Updated)**

#### **Week 4: Project Dashboard API (Updated)**

6. **Project Status Service (Updated)**
   ```javascript
   // services/ado-project-status.js
   class AdoProjectStatusService {
     constructor(database) {
       this.db = database;
     }
     
     async getProjectStatus(projectId) {
       const project = await this.db.get(`
         SELECT * FROM project_status WHERE project_id = ?
       `, [projectId]);
       
       const recentBuilds = await this.db.all(`
         SELECT * FROM ado_builds 
         WHERE ado_project_id = ? 
         ORDER BY finish_time DESC 
         LIMIT 10
       `, [projectId]);
       
       const metrics = await this.calculateMetrics(projectId);
       const trends = await this.calculateTrends(projectId);
       
       return {
         project,
         recentBuilds,
         metrics,
         trends,
         environments: await this.getEnvironmentStatus(projectId)
       };
     }
     
     async calculateMetrics(projectId, days = 30) {
       const cutoffDate = new Date();
       cutoffDate.setDate(cutoffDate.getDate() - days);
       
       const results = await this.db.get(`
         SELECT 
           COUNT(*) as total_builds,
           SUM(CASE WHEN result = 'succeeded' THEN 1 ELSE 0 END) as successful_builds,
           AVG(CASE WHEN result = 'succeeded' THEN 1.0 ELSE 0.0 END) * 100 as success_rate,
           SUM(tr.total_tests) as total_tests,
           SUM(tr.passed_tests) as passed_tests,
           SUM(tr.failed_tests) as failed_tests,
           AVG(tr.duration_ms) as avg_duration
         FROM ado_builds b
         LEFT JOIN ado_test_results tr ON b.ado_build_id = tr.ado_build_id
         WHERE b.ado_project_id = ? 
         AND b.finish_time >= ?
       `, [projectId, cutoffDate.toISOString()]);
       
       return results;
     }
     
     async calculateTrends(projectId) {
       // Calculate 7-day and 30-day trends
       const last7Days = await this.calculateMetrics(projectId, 7);
       const last30Days = await this.calculateMetrics(projectId, 30);
       const previous30Days = await this.calculateMetrics(projectId, 60);
       
       return {
         successRateTrend: this.calculatePercentageChange(
           previous30Days.success_rate, 
           last30Days.success_rate
         ),
         performanceTrend: this.calculatePercentageChange(
           previous30Days.avg_duration,
           last30Days.avg_duration,
           true // Lower is better for duration
         ),
         stabilityScore: await this.calculateStabilityScore(projectId)
       };
     }
   }
   ```

7. **Project Dashboard API Endpoints (Updated)**
   ```javascript
   // routes/ado-dashboard.js
   const express = require('express');
   const AdoProjectStatusService = require('../services/ado-project-status');
   
   const router = express.Router();
   
   // Get overall dashboard data
   router.get('/dashboard', async (req, res) => {
     try {
       const statusService = new AdoProjectStatusService(database);
       
       // Get all configured projects
       const projects = await database.all(`
         SELECT * FROM project_configurations WHERE enabled = 1
       `);
       
       const dashboardData = {
         summary: await statusService.getOverallSummary(),
         projects: [],
         alerts: await statusService.getActiveAlerts()
       };
       
       // Get status for each configured project
       for (const project of projects) {
         const projectStatus = await statusService.getProjectStatus(project.id);
         dashboardData.projects.push(projectStatus);
       }
       
       res.json(dashboardData);
     } catch (error) {
       console.error('Dashboard API error:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Get specific project details
   router.get('/project/:projectId', async (req, res) => {
     try {
       const { projectId } = req.params;
       const statusService = new AdoProjectStatusService(database);
       
       const projectData = await statusService.getProjectStatus(projectId);
       const detailedMetrics = await statusService.getDetailedMetrics(projectId);
       const testBreakdown = await statusService.getTestBreakdown(projectId);
       
       res.json({
         ...projectData,
         detailedMetrics,
         testBreakdown
       });
     } catch (error) {
       console.error('Project API error:', error);
       res.status(500).json({ error: error.message });
     }
   });
   
   // Get project trends and historical data
   router.get('/project/:projectId/trends', async (req, res) => {
     try {
       const { projectId } = req.params;
       const { period = '30d' } = req.query;
       
       const statusService = new AdoProjectStatusService(database);
       const trends = await statusService.getHistoricalTrends(projectId, period);
       
       res.json(trends);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   
   module.exports = router;
   ```

#### **Week 5: Frontend Dashboard Components (Updated)**

8. **React Project Dashboard (Updated)**
   ```jsx
   // frontend/src/components/AdoProjectDashboard.jsx
   import React, { useState, useEffect } from 'react';
   import { Card, Progress, Alert, Statistic, Row, Col } from 'antd';
   import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
   
   function AdoProjectDashboard() {
     const [dashboardData, setDashboardData] = useState(null);
     const [loading, setLoading] = useState(true);
     const [selectedProject, setSelectedProject] = useState(null);
     
     useEffect(() => {
       fetchDashboardData();
       
       // Set up real-time updates
       const socket = io();
       socket.on('ado:build-complete', handleBuildUpdate);
       
       return () => socket.disconnect();
     }, []);
     
     const fetchDashboardData = async () => {
       try {
         const response = await fetch('/api/ado/dashboard');
         const data = await response.json();
         setDashboardData(data);
       } catch (error) {
         console.error('Failed to fetch dashboard data:', error);
       } finally {
         setLoading(false);
       }
     };
     
     const handleBuildUpdate = (update) => {
       // Update dashboard data in real-time
       setDashboardData(prev => ({
         ...prev,
         projects: prev.projects.map(project => 
           project.project.project_id === update.projectId
             ? { ...project, lastBuild: update }
             : project
         )
       }));
     };
     
     if (loading) return <div>Loading dashboard...</div>;
     
     return (
       <div className="ado-dashboard">
         {/* Overall Summary */}
         <Row gutter={16} style={{ marginBottom: 24 }}>
           <Col span={6}>
             <Card>
               <Statistic
                 title="Total Projects"
                 value={dashboardData.projects.length}
                 valueStyle={{ color: '#1890ff' }}
               />
             </Card>
           </Col>
           <Col span={6}>
             <Card>
               <Statistic
                 title="Overall Success Rate"
                 value={dashboardData.summary.overallSuccessRate}
                 precision={1}
                 suffix="%"
                 valueStyle={{ 
                   color: dashboardData.summary.overallSuccessRate > 90 ? '#52c41a' : '#faad14' 
                 }}
               />
             </Card>
           </Col>
           <Col span={6}>
             <Card>
               <Statistic
                 title="Tests Today"
                 value={dashboardData.summary.testsToday}
                 valueStyle={{ color: '#722ed1' }}
               />
             </Card>
           </Col>
           <Col span={6}>
             <Card>
               <Statistic
                 title="Active Alerts"
                 value={dashboardData.alerts.length}
                 valueStyle={{ 
                   color: dashboardData.alerts.length > 0 ? '#ff4d4f' : '#52c41a' 
                 }}
               />
             </Card>
           </Col>
         </Row>
         
         {/* Active Alerts */}
         {dashboardData.alerts.length > 0 && (
           <Alert
             message="Active Alerts"
             description={
               <ul>
                 {dashboardData.alerts.map(alert => (
                   <li key={alert.id}>{alert.message}</li>
                 ))}
               </ul>
             }
             type="warning"
             showIcon
             style={{ marginBottom: 24 }}
           />
         )}
         
         {/* Project Grid */}
         <Row gutter={16}>
           {dashboardData.projects.map(projectData => (
             <Col span={8} key={projectData.project.project_id} style={{ marginBottom: 16 }}>
               <ProjectCard 
                 projectData={projectData}
                 onSelect={() => setSelectedProject(projectData)}
               />
             </Col>
           ))}
         </Row>
         
         {/* Detailed Project View */}
         {selectedProject && (
           <ProjectDetailModal
             projectData={selectedProject}
             onClose={() => setSelectedProject(null)}
           />
         )}
       </div>
     );
   }
   
   function ProjectCard({ projectData, onSelect }) {
     const { project, metrics, trends, recentBuilds } = projectData;
     
     const getHealthColor = (health) => {
       switch (health) {
         case 'healthy': return '#52c41a';
         case 'warning': return '#faad14';
         case 'critical': return '#ff4d4f';
         default: return '#d9d9d9';
       }
     };
     
     return (
       <Card
         title={project.project_name}
         extra={
           <span style={{ color: getHealthColor(project.overall_health) }}>
             ● {project.overall_health}
           </span>
         }
         onClick={onSelect}
         hoverable
       >
         <Row gutter={16}>
           <Col span={12}>
             <Statistic
               title="Success Rate"
               value={metrics.success_rate}
               precision={1}
               suffix="%"
               valueStyle={{ 
                 color: metrics.success_rate > 90 ? '#52c41a' : '#faad14',
                 fontSize: 16
               }}
             />
           </Col>
           <Col span={12}>
             <Statistic
               title="Tests"
               value={metrics.total_tests}
               valueStyle={{ fontSize: 16 }}
             />
           </Col>
         </Row>
         
         <div style={{ marginTop: 16 }}>
           <div>Trend: {trends.successRateTrend > 0 ? '↗' : '↘'} {Math.abs(trends.successRateTrend).toFixed(1)}%</div>
           <div>Last Build: {recentBuilds[0]?.result || 'N/A'}</div>
         </div>
         
         <Progress
           percent={metrics.success_rate}
           strokeColor={getHealthColor(project.overall_health)}
           showInfo={false}
           style={{ marginTop: 8 }}
         />
       </Card>
     );
   }
   
   export default AdoProjectDashboard;
   ```

### **Phase 3: Advanced Reporting (1-2 weeks)**

#### **Week 6-7: Report Generation and Export**

9. **Automated Report Generation**
   ```javascript
   // services/ado-report-generator.js
   const PDFDocument = require('pdfkit');
   const ExcelJS = require('exceljs');
   
   class AdoReportGenerator {
     constructor(projectStatusService) {
       this.statusService = projectStatusService;
     }
     
     async generateProjectReport(projectId, format = 'pdf', options = {}) {
       const projectData = await this.statusService.getProjectStatus(projectId);
       const trends = await this.statusService.getHistoricalTrends(projectId, '30d');
       
       switch (format.toLowerCase()) {
         case 'pdf':
           return await this.generatePDFReport(projectData, trends, options);
         case 'excel':
           return await this.generateExcelReport(projectData, trends, options);
         case 'json':
           return { projectData, trends };
         default:
           throw new Error(`Unsupported format: ${format}`);
       }
     }
     
     async generatePDFReport(projectData, trends, options) {
       const doc = new PDFDocument();
       const buffers = [];
       
       doc.on('data', buffers.push.bind(buffers));
       
       // Title page
       doc.fontSize(20).text(`Test Status Report: ${projectData.project.project_name}`, 50, 50);
       doc.fontSize(12).text(`Generated on: ${new Date().toISOString()}`, 50, 80);
       
       // Executive Summary
       doc.addPage().fontSize(16).text('Executive Summary', 50, 50);
       doc.fontSize(12)
          .text(`Overall Health: ${projectData.project.overall_health}`, 50, 80)
          .text(`Success Rate: ${projectData.metrics.success_rate.toFixed(1)}%`, 50, 100)
          .text(`Total Tests: ${projectData.metrics.total_tests}`, 50, 120);
       
       // Trends and charts would be added here
       // (Implementation would include chart generation)
       
       doc.end();
       
       return new Promise((resolve) => {
         doc.on('end', () => {
           const pdfBuffer = Buffer.concat(buffers);
           resolve({
             buffer: pdfBuffer,
             filename: `${projectData.project.project_name}_report_${Date.now()}.pdf`,
             contentType: 'application/pdf'
           });
         });
       });
     }
     
     async scheduleReports() {
       // Implementation for scheduled report generation
       // Would integrate with cron jobs or similar scheduling
     }
   }
   ```

## 📁 **File Structure Changes**

```
c:\MyRepositories\demoApp\
├── .env.ado                          # ADO configuration
├── .env.ado.example                  # Example configuration
├── lib/
│   └── ado-client.js                 # Azure DevOps API client
├── services/
│   ├── ado-build-consumer.js         # Build result consumption service
│   ├── ado-build-definition.js       # Build definition discovery service
│   ├── ado-project-configuration.js  # Project configuration management
│   ├── ado-project-status.js         # Project status aggregation
│   ├── ado-report-generator.js       # Report generation service
│   └── ado-realtime.js               # Real-time pipeline monitoring
├── routes/
│   ├── ado-webhooks.js               # Build completion webhooks
│   ├── ado-dashboard.js              # Project dashboard API
│   └── ado-project-config.js         # Project configuration API
├── scripts/
│   ├── test-ado-connection.js        # Connection testing
│   ├── setup-ado-integration.js      # Initial setup
│   └── sync-historical-data.js       # Historical data import
├── database/
│   └── migrations/
│       └── 001_ado_tables.sql        # ADO data schema
├── frontend/src/components/
│   ├── AdoProjectDashboard.jsx       # Main project dashboard
│   ├── ProjectConfiguration.jsx      # Project configuration interface
│   ├── ProjectCard.jsx               # Individual project cards
│   ├── ProjectDetailModal.jsx        # Detailed project view
│   ├── TrendChart.jsx                # Trend visualization
│   └── ReportBuilder.jsx             # Custom report builder
└── docs/
    ├── ADO_SETUP.md                  # Setup instructions
    ├── ADO_PIPELINE_INTEGRATION.md   # Pipeline webhook setup
    └── ADO_REPORTING.md              # Report configuration
```

## 🔧 **Configuration Requirements**

### **Azure DevOps Setup**

1. **Personal Access Token Scopes**
   - Work Items: Read & Write
   - Test Management: Read & Write
   - Build: Read
   - Release: Read
   - Code: Read (for Git operations)

2. **Service Hooks Configuration**
   - Build completed
   - Release created
   - Pull request created
   - Work item updated

3. **Project Permissions**
   - Contribute to work items
   - Manage test plans
   - View build definitions
   - View release definitions

### **Application Configuration**

```bash
# .env.ado
ADO_ORGANIZATION=https://dev.azure.com/yourorg
ADO_PROJECT=YourProject
ADO_PAT=your-personal-access-token-here
ADO_ENABLED=true

# Pipeline Result Consumption
ADO_CONSUME_BUILD_RESULTS=true
ADO_CONSUME_RELEASE_RESULTS=true
ADO_AUTO_SYNC_ON_COMPLETION=true
ADO_HISTORICAL_DATA_DAYS=90

# Project Status Configuration
ADO_PROJECT_HEALTH_THRESHOLDS='{"healthy":90,"warning":75,"critical":50}'
ADO_TREND_CALCULATION_DAYS=30
ADO_AUTO_GENERATE_REPORTS=true

# Webhook Configuration
ADO_WEBHOOK_SECRET=your-webhook-secret
ADO_BUILD_COMPLETE_WEBHOOK=true
ADO_RELEASE_COMPLETE_WEBHOOK=true

# Notification Configuration
ADO_TEAMS_WEBHOOK=https://outlook.office.com/webhook/...
ADO_NOTIFY_ON_HEALTH_CHANGE=true
ADO_NOTIFY_ON_CRITICAL_FAILURES=true
ADO_EMAIL_REPORTS=user@company.com

# Database Configuration
ADO_DATA_RETENTION_DAYS=365
ADO_CLEANUP_OLD_DATA=true
ADO_BACKUP_BEFORE_CLEANUP=true
```

## 📊 **Metrics and Monitoring**

### **Key Performance Indicators**
- Pipeline result consumption rate and latency
- Project health status accuracy
- Report generation performance
- Real-time dashboard update speed
- Data synchronization success rate

### **Project Health Metrics**
- **Success Rate Trends**: 7-day, 30-day, and 90-day trends
- **Test Coverage**: Number of tests per project over time
- **Performance Metrics**: Average test duration and build times
- **Stability Scores**: Flakiness and consistency measurements
- **Environment Health**: Status across dev, staging, production

### **Monitoring Dashboards**
- Real-time project status overview
- Pipeline consumption health
- Alert management and escalation
- Historical trend analysis
- Report generation metrics

## 🔐 **Security Considerations**

### **Authentication Security**
- Secure PAT storage in environment variables
- Token rotation procedures
- Least privilege access principles
- Audit logging for all API calls

### **Webhook Security**
- HMAC signature validation
- IP address allowlisting
- Rate limiting on webhook endpoints
- Request payload validation

### **Data Protection**
- Sensitive data masking in logs
- Secure transmission (HTTPS only)
- Data retention policies
- Access control for integration data

## 🧪 **Testing Strategy**

### **Unit Tests**
- ADO client library tests
- Work item creation logic
- Test result mapping functions
- Webhook processing logic

### **Integration Tests**
- End-to-end test run publishing
- Work item creation workflows
- Pipeline trigger scenarios
- Real-time data synchronization

### **Performance Tests**
- High-volume test result publishing
- Concurrent webhook processing
- Large test suite synchronization
- Real-time update performance

## 🚀 **Deployment Strategy**

### **Development Environment**
1. Local ADO organization setup
2. Development project configuration
3. Test webhook endpoints
4. Validate all integrations

### **Staging Environment**
1. Mirror production ADO setup
2. Test with realistic data volumes
3. Validate security configurations
4. Performance testing

### **Production Deployment**
1. Blue-green deployment strategy
2. Feature flags for gradual rollout
3. Monitoring and alerting setup
4. Rollback procedures

## 📈 **Success Metrics**

### **Phase 1 Success Criteria (Pipeline Data Ingestion)**
- ✅ Successful ADO API connection and authentication
- ✅ Build completion webhooks receiving and processing data
- ✅ Test results stored in local database
- ✅ Basic project status calculation working
- ✅ Real-time updates via WebSocket

### **Phase 2 Success Criteria (Project Status Reporting)**
- ✅ Project dashboard displaying accurate metrics
- ✅ Trend calculations and historical data analysis
- ✅ Multi-project overview functionality
- ✅ Environment-specific status tracking
- ✅ Alert system for critical failures

### **Phase 3 Success Criteria (Advanced Reporting)**
- ✅ Automated report generation (PDF, Excel, JSON)
- ✅ Scheduled report delivery
- ✅ Custom report builder interface
- ✅ Data export capabilities
- ✅ Performance optimization for large datasets

## 🔄 **Maintenance and Updates**

### **Regular Maintenance Tasks**
- ADO API version updates
- Token rotation schedule
- Performance monitoring
- Integration health checks

### **Update Procedures**
- Backward compatibility testing
- Configuration migration scripts
- Documentation updates
- User training materials

## 📚 **Documentation Plan**

1. **Setup Guide**: Step-by-step ADO integration setup
2. **API Reference**: All integration endpoints and methods
3. **Troubleshooting Guide**: Common issues and solutions
4. **Best Practices**: Recommended configurations and workflows
5. **Migration Guide**: Moving from other integrations

This comprehensive plan leverages your existing architecture and patterns to create a seamless Azure DevOps integration that enhances your test management capabilities while maintaining the quality and security standards of your current system.
