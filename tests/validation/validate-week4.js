const Database = require('./database/database');
const path = require('path');
const fs = require('fs');

// Week 4 Test Result Processing Validation Script
// This script validates all Week 4 implementation components

console.log('🚀 Starting Week 4 MVP Test Result Processing Validation...\n');

let validationResults = {
    passed: 0,
    failed: 0,
    details: []
};

function addResult(test, passed, message) {
    validationResults.details.push({
        test,
        passed,
        message
    });
    
    if (passed) {
        validationResults.passed++;
        console.log(`✅ ${test}: ${message}`);
    } else {
        validationResults.failed++;
        console.log(`❌ ${test}: ${message}`);
    }
}

async function validateWeek4Implementation() {
    console.log('📊 Week 4 Acceptance Criteria:');
    console.log('- Parse test results from ADO test APIs');
    console.log('- Identify and classify test failures');
    console.log('- Store failure data with ADO context');
    console.log('- Create basic JIRA issues for failures');
    console.log('- Real-time notifications via WebSocket\n');

    // 1. Test Failure Processor Service
    console.log('🔧 Validating Test Failure Processor Service...');
    try {
        const TestFailureProcessor = require('./services/test-failure-processor');
        const db = new Database();
        const processor = new TestFailureProcessor(db);
        
        // Check if service has required methods
        const requiredMethods = [
            'processBuildResults',
            'classifyFailure', 
            'parseTestName',
            'correlateWithExistingTests',
            'storeBuildResults',
            'getFailuresByPipeline',
            'getFailureDetails'
        ];
        
        let missingMethods = [];
        for (const method of requiredMethods) {
            if (typeof processor[method] !== 'function') {
                missingMethods.push(method);
            }
        }
        
        if (missingMethods.length === 0) {
            addResult('Test Failure Processor', true, 'Service loaded with all required methods');
        } else {
            addResult('Test Failure Processor', false, `Missing methods: ${missingMethods.join(', ')}`);
        }
        
    } catch (error) {
        addResult('Test Failure Processor', false, `Service failed to load: ${error.message}`);
    }

    // 2. Enhanced JIRA Integration Service
    console.log('🔧 Validating Enhanced JIRA Integration Service...');
    try {
        const EnhancedJiraIntegration = require('./services/enhanced-jira-integration');
        const db = new Database();
        const jiraService = new EnhancedJiraIntegration(db);
        
        // Check if service has required methods
        const requiredMethods = [
            'createIssueForFailure',
            'buildJiraIssueData',
            'determinePriority',
            'storeLinkage',
            'updateIssueFromFailure',
            'getIssueForFailure'
        ];
        
        let missingMethods = [];
        for (const method of requiredMethods) {
            if (typeof jiraService[method] !== 'function') {
                missingMethods.push(method);
            }
        }
        
        if (missingMethods.length === 0) {
            addResult('Enhanced JIRA Integration', true, 'Service loaded with all required methods');
        } else {
            addResult('Enhanced JIRA Integration', false, `Missing methods: ${missingMethods.join(', ')}`);
        }
        
    } catch (error) {
        addResult('Enhanced JIRA Integration', false, `Service failed to load: ${error.message}`);
    }

    // 3. Test Result Processing API Routes
    console.log('🔧 Validating Test Result Processing API Routes...');
    try {
        const routesPath = './routes/test-result-processing.js';
        if (!fs.existsSync(routesPath)) {
            addResult('Test Result Processing Routes', false, 'Routes file does not exist');
        } else {
            const routeContent = fs.readFileSync(routesPath, 'utf8');
            
            // Check for required API endpoints
            const requiredEndpoints = [
                'process-build/:buildId',
                'failures/:pipelineId',
                'failure/:id/create-jira-issue',
                "router.get('/failure/:id'",
                'process-builds/bulk',
                'dashboard/summary',
                'failure/:id/update',
                "router.delete('/failure/:id'"
            ];
            
            let missingEndpoints = [];
            for (const endpoint of requiredEndpoints) {
                if (!routeContent.includes(endpoint)) {
                    missingEndpoints.push(endpoint);
                }
            }
            
            if (missingEndpoints.length === 0) {
                addResult('Test Result Processing Routes', true, 'All required API endpoints found');
            } else {
                addResult('Test Result Processing Routes', false, `Missing endpoints: ${missingEndpoints.join(', ')}`);
            }
        }
        
    } catch (error) {
        addResult('Test Result Processing Routes', false, `Routes validation failed: ${error.message}`);
    }

    // 4. MVP WebSocket Service
    console.log('🔧 Validating MVP WebSocket Service...');
    try {
        const MVPWebSocketService = require('./websocket/mvp-updates');
        
        // Check if service has required methods
        const requiredMethods = [
            'handleConnection',
            'broadcastToSubscribers',
            'emitTestFailuresDetected',
            'emitBuildCompleted',
            'emitJiraIssueCreated',
            'emitBuildProcessingStarted',
            'emitBuildProcessingCompleted',
            'getConnectionStats'
        ];
        
        // Create mock Socket.IO instance for testing
        const mockIO = {
            to: () => ({ emit: () => {} }),
            on: () => {}
        };
        
        const websocketService = new MVPWebSocketService(mockIO);
        
        let missingMethods = [];
        for (const method of requiredMethods) {
            if (typeof websocketService[method] !== 'function') {
                missingMethods.push(method);
            }
        }
        
        if (missingMethods.length === 0) {
            addResult('MVP WebSocket Service', true, 'Service loaded with all required methods');
        } else {
            addResult('MVP WebSocket Service', false, `Missing methods: ${missingMethods.join(', ')}`);
        }
        
    } catch (error) {
        addResult('MVP WebSocket Service', false, `Service failed to load: ${error.message}`);
    }

    // 5. Database Schema (inherited from Week 3)
    console.log('🔧 Validating Database Schema...');
    try {
        const db = new Database();
        
        // Check for MVP tables (from Week 3, needed for Week 4)
        const requiredTables = [
            'mvp_pipeline_configs',
            'mvp_test_failures', 
            'mvp_jira_ado_links',
            'mvp_build_monitoring_log'
        ];
        
        // Use a simpler check method that works with our Database class
        let tableChecks = [];
        for (const table of requiredTables) {
            try {
                const result = await new Promise((resolve, reject) => {
                    db.db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                tableChecks.push({ table, exists: !!result });
            } catch (error) {
                tableChecks.push({ table, exists: false, error: error.message });
            }
        }
        
        const missingTables = tableChecks.filter(check => !check.exists).map(check => check.table);
        
        if (missingTables.length === 0) {
            addResult('Database Schema', true, 'All required MVP tables exist');
        } else {
            addResult('Database Schema', false, `Missing tables: ${missingTables.join(', ')}`);
        }
        
    } catch (error) {
        addResult('Database Schema', false, `Database validation failed: ${error.message}`);
    }

    // 6. Server Integration
    console.log('🔧 Validating Server Integration...');
    try {
        const serverPath = './server.js';
        if (!fs.existsSync(serverPath)) {
            addResult('Server Integration', false, 'Server.js file does not exist');
        } else {
            const serverContent = fs.readFileSync(serverPath, 'utf8');
            
            // Check for Week 4 service integrations
            const requiredIntegrations = [
                'test-failure-processor',
                'enhanced-jira-integration',
                'websocket/mvp-updates',
                'test-result-processing',
                'TestFailureProcessor',
                'EnhancedJiraIntegration',
                'MVPWebSocketService'
            ];
            
            let missingIntegrations = [];
            for (const integration of requiredIntegrations) {
                if (!serverContent.includes(integration)) {
                    missingIntegrations.push(integration);
                }
            }
            
            if (missingIntegrations.length === 0) {
                addResult('Server Integration', true, 'All Week 4 services integrated in server.js');
            } else {
                addResult('Server Integration', false, `Missing integrations: ${missingIntegrations.join(', ')}`);
            }
        }
        
    } catch (error) {
        addResult('Server Integration', false, `Server integration validation failed: ${error.message}`);
    }

    // 7. File Structure Validation
    console.log('🔧 Validating File Structure...');
    const requiredFiles = [
        './services/test-failure-processor.js',
        './services/enhanced-jira-integration.js', 
        './routes/test-result-processing.js',
        './websocket/mvp-updates.js'
    ];
    
    const fileChecks = requiredFiles.map(file => ({
        file,
        exists: fs.existsSync(file),
        size: fs.existsSync(file) ? fs.statSync(file).size : 0
    }));
    
    const missingFiles = fileChecks.filter(check => !check.exists).map(check => check.file);
    const emptyFiles = fileChecks.filter(check => check.exists && check.size === 0).map(check => check.file);
    
    if (missingFiles.length === 0 && emptyFiles.length === 0) {
        addResult('File Structure', true, 'All required Week 4 files exist and have content');
    } else {
        const issues = [];
        if (missingFiles.length > 0) issues.push(`Missing: ${missingFiles.join(', ')}`);
        if (emptyFiles.length > 0) issues.push(`Empty: ${emptyFiles.join(', ')}`);
        addResult('File Structure', false, issues.join('; '));
    }

    // 8. Feature Completeness Check
    console.log('🔧 Validating Feature Completeness...');
    
    // Check Test Result Processing Features
    const testProcessorPath = './services/test-failure-processor.js';
    if (fs.existsSync(testProcessorPath)) {
        const content = fs.readFileSync(testProcessorPath, 'utf8');
        const requiredFeatures = [
            'ADO test result parsing',
            'failure classification',
            'test name parsing',
            'correlation with existing tests',
            'buildResults storage'
        ];
        
        let foundFeatures = 0;
        if (content.includes('processBuildResults')) foundFeatures++;
        if (content.includes('classifyFailure')) foundFeatures++;
        if (content.includes('parseTestName')) foundFeatures++;
        if (content.includes('correlateWithExistingTests')) foundFeatures++;
        if (content.includes('storeBuildResults')) foundFeatures++;
        
        if (foundFeatures === requiredFeatures.length) {
            addResult('Test Processing Features', true, 'All test result processing features implemented');
        } else {
            addResult('Test Processing Features', false, `Only ${foundFeatures}/${requiredFeatures.length} features implemented`);
        }
    } else {
        addResult('Test Processing Features', false, 'Test processor file not found');
    }

    // Check JIRA Integration Features  
    const jiraPath = './services/enhanced-jira-integration.js';
    if (fs.existsSync(jiraPath)) {
        const content = fs.readFileSync(jiraPath, 'utf8');
        const requiredFeatures = [
            'JIRA issue creation',
            'priority determination',
            'ADO context inclusion',
            'issue linkage storage',
            'issue updates'
        ];
        
        let foundFeatures = 0;
        if (content.includes('createIssueForFailure')) foundFeatures++;
        if (content.includes('determinePriority')) foundFeatures++;
        if (content.includes('buildJiraIssueData')) foundFeatures++;
        if (content.includes('storeLinkage')) foundFeatures++;
        if (content.includes('updateIssueFromFailure')) foundFeatures++;
        
        if (foundFeatures === requiredFeatures.length) {
            addResult('JIRA Integration Features', true, 'All JIRA integration features implemented');
        } else {
            addResult('JIRA Integration Features', false, `Only ${foundFeatures}/${requiredFeatures.length} features implemented`);
        }
    } else {
        addResult('JIRA Integration Features', false, 'JIRA integration file not found');
    }

    // Final Summary
    console.log('\n📊 Week 4 Validation Summary:');
    console.log('─'.repeat(50));
    console.log(`✅ Passed: ${validationResults.passed}`);
    console.log(`❌ Failed: ${validationResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((validationResults.passed / (validationResults.passed + validationResults.failed)) * 100)}%`);
    
    if (validationResults.failed === 0) {
        console.log('\n🎉 Week 4 implementation is COMPLETE and ready for use!');
        console.log('\n🚀 Ready for Week 5: Frontend Dashboard Development');
    } else {
        console.log('\n⚠️  Week 4 implementation has issues that need to be addressed.');
        console.log('\nFailed Tests:');
        validationResults.details
            .filter(detail => !detail.passed)
            .forEach(detail => {
                console.log(`  ❌ ${detail.test}: ${detail.message}`);
            });
    }
    
    return validationResults;
}

// Run validation
validateWeek4Implementation()
    .then(results => {
        process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Validation failed with error:', error);
        process.exit(1);
    });
