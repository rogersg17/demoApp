#!/usr/bin/env node

/**
 * Phase 1 Foundation Infrastructure Testing Suite
 * Tests all implemented components for ADR-001 TMS architecture
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Import our new services
const GitIntegrationService = require('./services/git-integration');
const TestDiscoveryService = require('./services/test-discovery');
const TestIdentifierService = require('./services/test-identifier');
const TestCorrelationService = require('./utils/test-correlation');
const TestScannerService = require('./services/test-scanner');
const TestParser = require('./utils/test-parser');

// Import database
const Database = require('./database/database');

class Phase1TestSuite {
    constructor() {
        this.testResults = [];
        this.database = new Database();
        console.log('🧪 Phase 1 Foundation Infrastructure Test Suite');
        console.log('=' .repeat(60));
    }

    async runAllTests() {
        const tests = [
            { name: 'Database Schema Validation', method: this.testDatabaseSchema },
            { name: 'Git Integration Service', method: this.testGitIntegration },
            { name: 'Test Discovery Service', method: this.testTestDiscovery },
            { name: 'Test Identifier Service', method: this.testTestIdentifier },
            { name: 'Test Correlation Service', method: this.testTestCorrelation },
            { name: 'Test Scanner Service', method: this.testTestScanner },
            { name: 'Test Parser Utilities', method: this.testTestParser },
            { name: 'File Structure Validation', method: this.testFileStructure },
            { name: 'Configuration Files', method: this.testConfigurationFiles },
            { name: 'Integration Testing', method: this.testIntegration }
        ];

        console.log(`\n📋 Running ${tests.length} test suites...\n`);

        for (const test of tests) {
            try {
                console.log(`🔍 Testing: ${test.name}`);
                await test.method.call(this);
                this.logResult(test.name, 'PASS', '✅');
            } catch (error) {
                this.logResult(test.name, 'FAIL', '❌', error.message);
            }
        }

        this.printSummary();
    }

    async testDatabaseSchema() {
        console.log('  📊 Validating database schema...');
        
        // Test database initialization
        await this.database.init();
        
        // Check if new tables exist
        const tables = ['git_repositories', 'test_metadata', 'platform_integrations', 'test_executions'];
        
        for (const table of tables) {
            const result = await this.database.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
                [table]
            );
            if (!result) {
                throw new Error(`Table ${table} does not exist`);
            }
            console.log(`    ✓ Table ${table} exists`);
        }

        // Test basic CRUD operations
        const testRepo = {
            name: 'test-repo',
            url: 'https://github.com/test/repo.git',
            default_branch: 'main',
            webhook_secret: 'test-secret'
        };

        const repoId = await this.database.run(
            "INSERT INTO git_repositories (name, url, default_branch, webhook_secret) VALUES (?, ?, ?, ?)",
            [testRepo.name, testRepo.url, testRepo.default_branch, testRepo.webhook_secret]
        );

        console.log(`    ✓ Repository inserted with ID: ${repoId.lastID}`);

        // Clean up test data
        await this.database.run("DELETE FROM git_repositories WHERE name = ?", [testRepo.name]);
        console.log(`    ✓ Test data cleaned up`);
    }

    async testGitIntegration() {
        console.log('  🔧 Testing Git Integration Service...');
        
        const gitService = new GitIntegrationService();
        
        // Test webhook payload parsing
        const mockWebhook = {
            repository: {
                full_name: 'test/repo',
                clone_url: 'https://github.com/test/repo.git',
                default_branch: 'main'
            },
            commits: [{
                modified: ['tests/example.spec.js'],
                added: ['tests/new-test.spec.js']
            }]
        };

        const result = gitService.parseWebhookPayload(mockWebhook, 'github');
        if (!result.repositoryName || !result.changes) {
            throw new Error('Webhook payload parsing failed');
        }
        console.log(`    ✓ Webhook payload parsed successfully`);

        // Test repository registration
        const repoData = {
            name: 'test-integration-repo',
            url: 'https://github.com/test/integration.git',
            provider: 'github'
        };

        // Note: This would normally register with database, but we'll test the service logic
        const validation = gitService.validateRepository(repoData);
        if (!validation.isValid) {
            throw new Error(`Repository validation failed: ${validation.errors.join(', ')}`);
        }
        console.log(`    ✓ Repository validation passed`);
    }

    async testTestDiscovery() {
        console.log('  🔍 Testing Test Discovery Service...');
        
        const discoveryService = new TestDiscoveryService();
        
        // Test with current workspace (which has test files)
        const testFiles = await discoveryService.scanForTestFiles('./tests');
        
        if (!Array.isArray(testFiles)) {
            throw new Error('Test file scanning did not return an array');
        }
        
        console.log(`    ✓ Found ${testFiles.length} test files in ./tests`);

        // Test framework detection
        const frameworks = discoveryService.detectFrameworks('./');
        if (!Array.isArray(frameworks) || frameworks.length === 0) {
            console.log('    ⚠️  No test frameworks detected (expected in demo app)');
        } else {
            console.log(`    ✓ Detected frameworks: ${frameworks.join(', ')}`);
        }

        // Test metadata extraction from a sample test file
        if (testFiles.length > 0) {
            const metadata = await discoveryService.extractTestMetadata(testFiles[0]);
            if (!metadata || !metadata.filePath) {
                throw new Error('Test metadata extraction failed');
            }
            console.log(`    ✓ Metadata extracted for ${metadata.filePath}`);
        }
    }

    async testTestIdentifier() {
        console.log('  🆔 Testing Test Identifier Service...');
        
        const identifierService = new TestIdentifierService();
        
        // Test unique ID generation
        const testInfo = {
            filePath: 'tests/example.spec.js',
            testName: 'should login successfully',
            parameters: { browser: 'chromium' }
        };

        const testId = identifierService.generateTestId(testInfo.filePath, testInfo.testName, testInfo.parameters);
        if (!testId || typeof testId !== 'string') {
            throw new Error('Test ID generation failed');
        }
        console.log(`    ✓ Generated test ID: ${testId.substring(0, 16)}...`);

        // Test signature generation
        const signature = identifierService.generateTestSignature(testInfo);
        if (!signature || !signature.fileHash || !signature.nameHash) {
            throw new Error('Test signature generation failed');
        }
        console.log(`    ✓ Generated test signature`);

        // Test consistency (same input should produce same ID)
        const testId2 = identifierService.generateTestId(testInfo.filePath, testInfo.testName, testInfo.parameters);
        if (testId !== testId2) {
            throw new Error('Test ID generation is not consistent');
        }
        console.log(`    ✓ Test ID generation is consistent`);
    }

    async testTestCorrelation() {
        console.log('  🔗 Testing Test Correlation Service...');
        
        const correlationService = new TestCorrelationService();
        
        // Mock test metadata
        const testMetadata = [{
            test_id: 'test-123',
            file_path: 'tests/login.spec.js',
            test_name: 'should login with valid credentials',
            signature: { nameHash: 'abc123', fileHash: 'def456' }
        }];

        // Mock platform results
        const platformResults = [{
            testTitle: 'should login with valid credentials',
            filePath: 'tests/login.spec.js',
            status: 'passed',
            duration: 1500
        }];

        const correlations = await correlationService.correlateResults(platformResults, testMetadata);
        
        if (!Array.isArray(correlations) || correlations.length === 0) {
            throw new Error('Test correlation failed to find matches');
        }
        
        const correlation = correlations[0];
        if (!correlation.testId || !correlation.platformResult) {
            throw new Error('Correlation result structure is invalid');
        }
        
        console.log(`    ✓ Correlated ${correlations.length} test result(s)`);
        console.log(`    ✓ Correlation confidence: ${correlation.confidence}`);
    }

    async testTestScanner() {
        console.log('  📡 Testing Test Scanner Service...');
        
        const scannerService = new TestScannerService();
        
        // Test repository scanning
        const scanResults = await scannerService.scanRepository('./tests');
        
        if (!scanResults || !scanResults.summary) {
            throw new Error('Repository scanning failed');
        }
        
        console.log(`    ✓ Scanned repository with ${scanResults.summary.totalFiles} files`);
        console.log(`    ✓ Found ${scanResults.summary.testFiles} test files`);
        
        // Test detailed analysis
        if (scanResults.testFiles && scanResults.testFiles.length > 0) {
            const detailedAnalysis = await scannerService.analyzeTestFile(scanResults.testFiles[0].path);
            if (!detailedAnalysis || !detailedAnalysis.complexity) {
                throw new Error('Detailed test file analysis failed');
            }
            console.log(`    ✓ Analyzed test file complexity: ${detailedAnalysis.complexity.score}`);
        }
    }

    async testTestParser() {
        console.log('  📝 Testing Test Parser Utilities...');
        
        const parser = new TestParser();
        
        // Test framework detection
        const sampleJsFile = `
describe('Login Tests', () => {
    test('should login successfully', async () => {
        // test implementation
    });
});
`;

        const framework = parser.detectFramework('test.spec.js', sampleJsFile);
        if (!framework) {
            throw new Error('Framework detection failed');
        }
        console.log(`    ✓ Detected framework: ${framework}`);

        // Test parsing
        const tests = parser.parseTestFile('test.spec.js', sampleJsFile, framework);
        if (!Array.isArray(tests) || tests.length === 0) {
            throw new Error('Test parsing failed');
        }
        console.log(`    ✓ Parsed ${tests.length} test(s) from sample file`);
        
        // Test all supported frameworks
        const supportedFrameworks = ['playwright', 'jest', 'mocha', 'cypress', 'vitest'];
        for (const fw of supportedFrameworks) {
            const isSupported = parser.isFrameworkSupported(fw);
            if (!isSupported) {
                throw new Error(`Framework ${fw} should be supported`);
            }
        }
        console.log(`    ✓ All ${supportedFrameworks.length} frameworks are supported`);
    }

    async testFileStructure() {
        console.log('  📁 Testing File Structure...');
        
        const requiredFiles = [
            'services/git-integration.js',
            'services/test-discovery.js',
            'services/test-identifier.js',
            'services/test-scanner.js',
            'utils/test-correlation.js',
            'utils/test-parser.js',
            'routes/git-webhooks.js',
            'migrations/001_adr_implementation.sql'
        ];

        for (const file of requiredFiles) {
            const fullPath = path.join('./', file);
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Required file missing: ${file}`);
            }
            console.log(`    ✓ ${file} exists`);
        }

        // Check directories
        const requiredDirs = ['.tms', 'migrations'];
        for (const dir of requiredDirs) {
            const fullPath = path.join('./', dir);
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Required directory missing: ${dir}`);
            }
            console.log(`    ✓ ${dir}/ directory exists`);
        }
    }

    async testConfigurationFiles() {
        console.log('  ⚙️  Testing Configuration Files...');
        
        // Test .env.tms
        const envFile = '.env.tms';
        if (!fs.existsSync(envFile)) {
            throw new Error(`Configuration file missing: ${envFile}`);
        }
        console.log(`    ✓ ${envFile} exists`);

        // Test TMS metadata
        const metadataFile = '.tms/metadata.json';
        if (!fs.existsSync(metadataFile)) {
            throw new Error(`Metadata file missing: ${metadataFile}`);
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        if (!metadata.version || !metadata.adrVersion) {
            throw new Error('Invalid metadata structure');
        }
        console.log(`    ✓ ${metadataFile} exists and is valid`);
        console.log(`    ✓ TMS version: ${metadata.version}, ADR: ${metadata.adrVersion}`);
    }

    async testIntegration() {
        console.log('  🔄 Testing Service Integration...');
        
        // Test end-to-end workflow simulation
        const gitService = new GitIntegrationService();
        const discoveryService = new TestDiscoveryService();
        const identifierService = new TestIdentifierService();
        
        // Simulate Git webhook received
        const mockWebhook = {
            repository: { 
                full_name: 'test/integration',
                clone_url: 'https://github.com/test/integration.git'
            },
            commits: [{ modified: ['tests/integration.spec.js'] }]
        };

        // 1. Parse webhook
        const webhookData = gitService.parseWebhookPayload(mockWebhook, 'github');
        console.log(`    ✓ Webhook parsed: ${webhookData.repositoryName}`);

        // 2. Simulate test discovery on changed files
        const changedTestFiles = webhookData.changes.modified.filter(file => 
            file.includes('.spec.') || file.includes('.test.')
        );
        console.log(`    ✓ Found ${changedTestFiles.length} changed test file(s)`);

        // 3. Generate test identifiers for new/changed tests
        if (changedTestFiles.length > 0) {
            const testId = identifierService.generateTestId(
                changedTestFiles[0], 
                'sample test', 
                {}
            );
            console.log(`    ✓ Generated test ID for changed file`);
        }

        console.log(`    ✓ End-to-end integration workflow completed`);
    }

    logResult(testName, status, icon, error = null) {
        const result = {
            name: testName,
            status,
            error
        };
        this.testResults.push(result);
        
        if (status === 'PASS') {
            console.log(`  ${icon} ${testName}: ${status}\n`);
        } else {
            console.log(`  ${icon} ${testName}: ${status}`);
            console.log(`     Error: ${error}\n`);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PHASE 1 TEST SUMMARY');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`\n✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${failed}/${total}`);
        console.log(`📈 Success Rate: ${((passed/total) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }

        console.log('\n🎯 PHASE 1 COMPONENTS STATUS:');
        const components = [
            'Git Integration Service',
            'Test Discovery Service', 
            'Test Identifier Service',
            'Database Schema Extensions',
            'Git Webhook Infrastructure',
            'Test Scanner Service',
            'Test Correlation Utilities',
            'Framework-Specific Parsers'
        ];

        components.forEach(component => {
            const testResult = this.testResults.find(r => r.name.includes(component.split(' ')[0]));
            const status = testResult ? testResult.status : 'UNKNOWN';
            const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '❓';
            console.log(`  ${icon} ${component}`);
        });

        if (passed === total) {
            console.log('\n🎉 ALL PHASE 1 TESTS PASSED!');
            console.log('Foundation Infrastructure is ready for Phase 2 or production use.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.');
        }

        console.log('\n📋 Next Steps:');
        console.log('  1. Review any failed tests and fix issues');
        console.log('  2. Test with real Git repository integration');
        console.log('  3. Validate webhook endpoints with actual platforms');
        console.log('  4. Proceed to Phase 2: Platform Integration');
        
        console.log('\n' + '='.repeat(60));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const testSuite = new Phase1TestSuite();
    testSuite.runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = Phase1TestSuite;
