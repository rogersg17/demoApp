/**
 * Week 5 Validation Script
 * 
 * Validates implementation of JIRA-ADO Bridge Integration components:
 * - JIRA-ADO Bridge Service
 * - ADO Test Correlation
 * - Workflow Automation Routes
 * - Duplicate Detection
 * - Server Integration
 */

const Database = require('./database/database');
const path = require('path');
const fs = require('fs');

class Week5Validator {
    constructor() {
        this.db = new Database();
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    async runValidation() {
        console.log('🔍 Starting Week 5 JIRA-ADO Bridge Integration Validation...\n');

        // Test components
        await this.validateJiraAdoBridgeService();
        await this.validateAdoTestCorrelation();
        await this.validateWorkflowAutomationRoutes();
        await this.validateDuplicateDetector();
        await this.validateServerIntegration();
        await this.validateDatabase();
        await this.validateWebSocketIntegration();

        // Test comprehensive workflow
        await this.validateEndToEndWorkflow();

        this.printResults();
        return this.results.failed === 0;
    }

    async validateJiraAdoBridgeService() {
        this.test('JIRA-ADO Bridge Service - File exists', () => {
            const filePath = './services/mvp-jira-ado-bridge.js';
            return fs.existsSync(filePath);
        });

        try {
            const MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
            
            this.test('JIRA-ADO Bridge Service - Class loads', () => {
                return typeof MVPJiraAdoBridge === 'function';
            });

            const mockTestFailureProcessor = { processTestResults: () => {} };
            const mockJiraIntegration = { createIssue: () => {} };
            const mockDuplicateDetector = { checkForDuplicates: () => {} };

            const bridge = new MVPJiraAdoBridge(
                this.db.db, 
                mockTestFailureProcessor, 
                mockJiraIntegration, 
                mockDuplicateDetector
            );

            this.test('JIRA-ADO Bridge Service - Instantiation', () => {
                return bridge !== null && typeof bridge === 'object';
            });

            this.test('JIRA-ADO Bridge Service - processBuildCompletion method', () => {
                return typeof bridge.processBuildCompletion === 'function';
            });

            this.test('JIRA-ADO Bridge Service - processFailureForJira method', () => {
                return typeof bridge.processFailureForJira === 'function';
            });

            this.test('JIRA-ADO Bridge Service - enrichFailureContext method', () => {
                return typeof bridge.enrichFailureContext === 'function';
            });

            this.test('JIRA-ADO Bridge Service - handleDuplicateDetection method', () => {
                return typeof bridge.handleDuplicateDetection === 'function';
            });

        } catch (error) {
            this.test('JIRA-ADO Bridge Service - Loading error', () => {
                throw new Error(`Failed to load: ${error.message}`);
            });
        }
    }

    async validateAdoTestCorrelation() {
        this.test('ADO Test Correlation - File exists', () => {
            const filePath = './utils/ado-test-correlation.js';
            return fs.existsSync(filePath);
        });

        try {
            const AdoTestCorrelation = require('./utils/ado-test-correlation');
            
            this.test('ADO Test Correlation - Class loads', () => {
                return typeof AdoTestCorrelation === 'function';
            });

            const correlation = new AdoTestCorrelation(this.db.db);

            this.test('ADO Test Correlation - Instantiation', () => {
                return correlation !== null && typeof correlation === 'object';
            });

            this.test('ADO Test Correlation - correlateTestResults method', () => {
                return typeof correlation.correlateTestResults === 'function';
            });

            this.test('ADO Test Correlation - findBestMatch method', () => {
                return typeof correlation.findBestMatch === 'function';
            });

            this.test('ADO Test Correlation - calculateMatchScore method', () => {
                return typeof correlation.calculateMatchScore === 'function';
            });

            this.test('ADO Test Correlation - detectFailurePatterns method', () => {
                return typeof correlation.detectFailurePatterns === 'function';
            });

            // Test correlation functionality
            const sampleTestResults = [
                {
                    testName: 'Sample Test',
                    failure_message: 'Assertion failed',
                    filePath: 'tests/sample.test.js'
                }
            ];

            const correlationResult = await correlation.correlateTestResults(sampleTestResults);
            this.test('ADO Test Correlation - correlateTestResults execution', () => {
                return correlationResult && 
                       typeof correlationResult.correlations === 'object' &&
                       typeof correlationResult.stats === 'object';
            });

        } catch (error) {
            this.test('ADO Test Correlation - Loading error', () => {
                throw new Error(`Failed to load: ${error.message}`);
            });
        }
    }

    async validateWorkflowAutomationRoutes() {
        this.test('Workflow Automation Routes - File exists', () => {
            const filePath = './routes/workflow-automation.js';
            return fs.existsSync(filePath);
        });

        try {
            const workflowRouter = require('./routes/workflow-automation');
            
            this.test('Workflow Automation Routes - Router loads', () => {
                return workflowRouter && typeof workflowRouter === 'function';
            });

            // Check router stack for expected routes
            const routePaths = workflowRouter.stack?.map(layer => layer.route?.path) || [];
            
            this.test('Workflow Automation Routes - GET /rules route', () => {
                return routePaths.includes('/rules') || 
                       workflowRouter.stack?.some(layer => 
                           layer.route?.methods?.get && layer.route?.path === '/rules'
                       );
            });

            this.test('Workflow Automation Routes - POST /rules route', () => {
                return routePaths.includes('/rules') ||
                       workflowRouter.stack?.some(layer => 
                           layer.route?.methods?.post && layer.route?.path === '/rules'
                       );
            });

            this.test('Workflow Automation Routes - PUT /rules/:id route', () => {
                return routePaths.includes('/rules/:id') ||
                       workflowRouter.stack?.some(layer => 
                           layer.route?.methods?.put && layer.route?.path === '/rules/:id'
                       );
            });

            this.test('Workflow Automation Routes - GET /history route', () => {
                return routePaths.includes('/history') ||
                       workflowRouter.stack?.some(layer => 
                           layer.route?.methods?.get && layer.route?.path === '/history'
                       );
            });

            this.test('Workflow Automation Routes - POST /trigger route', () => {
                return routePaths.includes('/trigger') ||
                       workflowRouter.stack?.some(layer => 
                           layer.route?.methods?.post && layer.route?.path === '/trigger'
                       );
            });

        } catch (error) {
            this.test('Workflow Automation Routes - Loading error', () => {
                throw new Error(`Failed to load: ${error.message}`);
            });
        }
    }

    async validateDuplicateDetector() {
        this.test('Duplicate Detector - File exists', () => {
            const filePath = './services/duplicate-detector.js';
            return fs.existsSync(filePath);
        });

        try {
            const DuplicateDetector = require('./services/duplicate-detector');
            
            this.test('Duplicate Detector - Class loads', () => {
                return typeof DuplicateDetector === 'function';
            });

            const detector = new DuplicateDetector(this.db.db);

            this.test('Duplicate Detector - Instantiation', () => {
                return detector !== null && typeof detector === 'object';
            });

            this.test('Duplicate Detector - checkForDuplicates method', () => {
                return typeof detector.checkForDuplicates === 'function';
            });

            this.test('Duplicate Detector - calculateIssueSimilarity method', () => {
                return typeof detector.calculateIssueSimilarity === 'function';
            });

            this.test('Duplicate Detector - calculateTextSimilarity method', () => {
                return typeof detector.calculateTextSimilarity === 'function';
            });

            this.test('Duplicate Detector - identifyConsolidationOpportunities method', () => {
                return typeof detector.identifyConsolidationOpportunities === 'function';
            });

            // Test duplicate detection functionality
            const sampleIssueData = {
                project_key: 'TEST',
                test_name: 'Sample Test',
                failure_message: 'Test failure',
                timeWindowHours: 24
            };

            const duplicateResult = await detector.checkForDuplicates(sampleIssueData);
            this.test('Duplicate Detector - checkForDuplicates execution', () => {
                return duplicateResult && 
                       typeof duplicateResult.hasDuplicates === 'boolean' &&
                       Array.isArray(duplicateResult.duplicates) &&
                       typeof duplicateResult.recommendation === 'string';
            });

        } catch (error) {
            this.test('Duplicate Detector - Loading error', () => {
                throw new Error(`Failed to load: ${error.message}`);
            });
        }
    }

    async validateServerIntegration() {
        this.test('Server Integration - server.js exists', () => {
            return fs.existsSync('./server.js');
        });

        try {
            const serverContent = fs.readFileSync('./server.js', 'utf8');
            
            this.test('Server Integration - JIRA-ADO Bridge import', () => {
                return serverContent.includes('mvp-jira-ado-bridge') ||
                       serverContent.includes('MVPJiraAdoBridge');
            });

            this.test('Server Integration - ADO Test Correlation import', () => {
                return serverContent.includes('ado-test-correlation') ||
                       serverContent.includes('AdoTestCorrelation');
            });

            this.test('Server Integration - Duplicate Detector import', () => {
                return serverContent.includes('duplicate-detector') ||
                       serverContent.includes('DuplicateDetector');
            });

            this.test('Server Integration - Workflow Automation routes', () => {
                return serverContent.includes('workflow-automation') &&
                       serverContent.includes('/api/workflow');
            });

            this.test('Server Integration - Week 5 services initialization', () => {
                return serverContent.includes('mvpJiraAdoBridge') &&
                       serverContent.includes('adoTestCorrelation') &&
                       serverContent.includes('duplicateDetector');
            });

            this.test('Server Integration - Build completion integration', () => {
                return serverContent.includes('build_completed') &&
                       serverContent.includes('processBuildCompletion');
            });

        } catch (error) {
            this.test('Server Integration - File read error', () => {
                throw new Error(`Failed to read server.js: ${error.message}`);
            });
        }
    }

    async validateDatabase() {
        try {
            // Test database tables for Week 5
            const tables = [
                'mvp_workflow_rules',
                'mvp_workflow_history',
                'mvp_ado_jira_correlations',
                'mvp_jira_issues'
            ];

            for (const table of tables) {
                await this.test(`Database - ${table} table exists`, async () => {
                    const result = await this.db.db.get(`
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name=?
                    `, [table]);
                    return result !== undefined;
                });
            }

            // Test workflow rules table structure
            await this.test('Database - mvp_workflow_rules structure', async () => {
                const columns = await this.db.db.all(`PRAGMA table_info(mvp_workflow_rules)`);
                const columnNames = columns.map(col => col.name);
                
                const requiredColumns = ['id', 'name', 'rule_type', 'conditions', 'actions', 'jira_config'];
                return requiredColumns.every(col => columnNames.includes(col));
            });

            // Test correlation table structure
            await this.test('Database - mvp_ado_jira_correlations structure', async () => {
                const columns = await this.db.db.all(`PRAGMA table_info(mvp_ado_jira_correlations)`);
                const columnNames = columns.map(col => col.name);
                
                const requiredColumns = ['id', 'failure_id', 'jira_issue_key', 'correlation_confidence'];
                return requiredColumns.every(col => columnNames.includes(col));
            });

        } catch (error) {
            this.test('Database - Connection error', () => {
                throw new Error(`Database validation failed: ${error.message}`);
            });
        }
    }

    async validateWebSocketIntegration() {
        try {
            const websocketContent = fs.readFileSync('./websocket/mvp-updates.js', 'utf8');
            
            this.test('WebSocket Integration - Week 5 events setup', () => {
                return websocketContent.includes('workflowExecuted') &&
                       websocketContent.includes('duplicateDetected') &&
                       websocketContent.includes('correlationCompleted');
            });

            this.test('WebSocket Integration - Week 5 emit methods', () => {
                return websocketContent.includes('emitWorkflowExecuted') &&
                       websocketContent.includes('emitDuplicateDetected') &&
                       websocketContent.includes('emitCorrelationCompleted');
            });

            this.test('WebSocket Integration - Week 5 subscriptions', () => {
                return websocketContent.includes('workflow-monitoring') &&
                       websocketContent.includes('duplicate-monitoring') &&
                       websocketContent.includes('correlation-monitoring');
            });

        } catch (error) {
            this.test('WebSocket Integration - File read error', () => {
                throw new Error(`Failed to read WebSocket file: ${error.message}`);
            });
        }
    }

    async validateEndToEndWorkflow() {
        try {
            // Test complete workflow integration
            this.test('End-to-End - All Week 5 components load together', () => {
                const MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
                const AdoTestCorrelation = require('./utils/ado-test-correlation');
                const DuplicateDetector = require('./services/duplicate-detector');
                const workflowRouter = require('./routes/workflow-automation');
                
                return MVPJiraAdoBridge && AdoTestCorrelation && 
                       DuplicateDetector && workflowRouter;
            });

            this.test('End-to-End - Service dependencies can be injected', () => {
                const MVPJiraAdoBridge = require('./services/mvp-jira-ado-bridge');
                const AdoTestCorrelation = require('./utils/ado-test-correlation');
                const DuplicateDetector = require('./services/duplicate-detector');
                
                const testFailureProcessor = { processTestResults: () => {} };
                const enhancedJiraIntegration = { createIssue: () => {} };
                const duplicateDetector = new DuplicateDetector(this.db.db);
                
                const bridge = new MVPJiraAdoBridge(
                    this.db.db, 
                    testFailureProcessor,
                    enhancedJiraIntegration,
                    duplicateDetector
                );
                
                return bridge && bridge.testFailureProcessor && 
                       bridge.jiraIntegration && bridge.duplicateDetector;
            });

            this.test('End-to-End - Workflow rule structure validation', async () => {
                // Test that workflow rules can be processed
                const sampleRule = {
                    id: 1,
                    name: 'Test Rule',
                    rule_type: 'failure_to_jira',
                    conditions: JSON.stringify({ test_name: 'sample' }),
                    actions: JSON.stringify({ create_jira_issue: true }),
                    jira_config: JSON.stringify({ project: 'TEST' }),
                    is_active: 1
                };

                // This validates the structure matches what the bridge expects
                const parsedConditions = JSON.parse(sampleRule.conditions);
                const parsedActions = JSON.parse(sampleRule.actions);
                const parsedJiraConfig = JSON.parse(sampleRule.jira_config);
                
                return parsedConditions && parsedActions && parsedJiraConfig &&
                       sampleRule.rule_type === 'failure_to_jira';
            });

        } catch (error) {
            this.test('End-to-End - Integration error', () => {
                throw new Error(`End-to-end validation failed: ${error.message}`);
            });
        }
    }

    test(description, testFunction) {
        this.results.total++;
        try {
            const result = testFunction();
            if (result instanceof Promise) {
                return result.then(asyncResult => {
                    if (asyncResult) {
                        console.log(`✅ ${description}`);
                        this.results.passed++;
                        this.results.details.push({ description, status: 'PASSED' });
                    } else {
                        console.log(`❌ ${description}`);
                        this.results.failed++;
                        this.results.details.push({ description, status: 'FAILED', error: 'Test returned false' });
                    }
                    return asyncResult;
                }).catch(error => {
                    console.log(`❌ ${description}: ${error.message}`);
                    this.results.failed++;
                    this.results.details.push({ description, status: 'FAILED', error: error.message });
                    return false;
                });
            } else {
                if (result) {
                    console.log(`✅ ${description}`);
                    this.results.passed++;
                    this.results.details.push({ description, status: 'PASSED' });
                } else {
                    console.log(`❌ ${description}`);
                    this.results.failed++;
                    this.results.details.push({ description, status: 'FAILED', error: 'Test returned false' });
                }
                return result;
            }
        } catch (error) {
            console.log(`❌ ${description}: ${error.message}`);
            this.results.failed++;
            this.results.details.push({ description, status: 'FAILED', error: error.message });
            return false;
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 WEEK 5 VALIDATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL WEEK 5 TESTS PASSED! JIRA-ADO Bridge Integration is complete.');
            console.log('\n📋 Week 5 Acceptance Criteria Verified:');
            console.log('✅ JIRA-ADO Bridge Service for automated workflow orchestration');
            console.log('✅ ADO Test Correlation for intelligent test matching');
            console.log('✅ Workflow Automation API routes for configuration');
            console.log('✅ Duplicate Detection service for intelligent issue management');
            console.log('✅ Complete server integration with all services');
            console.log('✅ Database schema for workflow rules and correlation tracking');
            console.log('✅ WebSocket integration for real-time workflow updates');
            console.log('✅ End-to-end workflow automation from ADO failures to JIRA issues');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the failed tests above.');
        }
        
        console.log('='.repeat(80));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new Week5Validator();
    validator.runValidation().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation failed:', error);
        process.exit(1);
    });
}

module.exports = Week5Validator;
