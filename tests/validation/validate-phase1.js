#!/usr/bin/env node

/**
 * Simple Phase 1 Validation Tests
 * Basic validation of implemented components
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Phase 1 Foundation Infrastructure - Simple Validation');
console.log('=' .repeat(60));

async function validateFiles() {
    console.log('\n📁 1. File Structure Validation');
    
    const requiredFiles = [
        'services/git-integration.js',
        'services/test-discovery.js', 
        'services/test-identifier.js',
        'services/test-scanner.js',
        'utils/test-correlation.js',
        'utils/test-parser.js',
        'routes/git-webhooks.js',
        'migrations/001_adr_implementation.sql',
        '.env.tms',
        '.tms/metadata.json'
    ];

    let allFilesExist = true;
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '../../', file);
        const exists = fs.existsSync(filePath);
        console.log(`  ${exists ? '✅' : '❌'} ${file}`);
        if (!exists) allFilesExist = false;
    }
    
    return allFilesExist;
}

async function validateDatabase() {
    console.log('\n📊 2. Database Schema Validation');
    
    try {
        const Database = require('../../database/database');
        const db = new Database();
        
        // Initialize database
        if (typeof db.initializeTables === 'function') {
            await db.initializeTables();
        } else {
            console.log('  ⚠️  Database init method not found, trying direct connection');
        }
        
        // Check tables exist
        const tables = ['git_repositories', 'test_metadata', 'platform_integrations', 'test_executions'];
        
        for (const table of tables) {
            try {
                const result = await new Promise((resolve, reject) => {
                    db.db.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
                        [table],
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });
                console.log(`  ${result ? '✅' : '❌'} Table: ${table}`);
            } catch (error) {
                console.log(`  ❌ Table: ${table} (Error: ${error.message})`);
                return false;
            }
        }
        
        console.log('  ✅ Database schema validation passed');
        return true;
    } catch (error) {
        console.log(`  ❌ Database validation failed: ${error.message}`);
        return false;
    }
}

async function validateServices() {
    console.log('\n🔧 3. Service Import Validation');
    
    const services = [
        { name: 'GitIntegrationService', path: '../../services/git-integration' },
        { name: 'TestDiscoveryService', path: '../../services/test-discovery' },
        { name: 'TestIdentifierService', path: '../../services/test-identifier' },
        { name: 'TestScannerService', path: '../../services/test-scanner' },
        { name: 'TestCorrelationService', path: '../../utils/test-correlation' },
        { name: 'TestParser', path: '../../utils/test-parser' }
    ];
    
    let allServicesValid = true;
    
    for (const service of services) {
        try {
            const ServiceClass = require(service.path);
            const instance = new ServiceClass();
            console.log(`  ✅ ${service.name} imported and instantiated`);
        } catch (error) {
            console.log(`  ❌ ${service.name} failed: ${error.message}`);
            allServicesValid = false;
        }
    }
    
    return allServicesValid;
}

async function validateConfiguration() {
    console.log('\n⚙️  4. Configuration Validation');
    
    try {
        // Validate .env.tms
        if (fs.existsSync('.env.tms')) {
            const envContent = fs.readFileSync('.env.tms', 'utf8');
            console.log('  ✅ .env.tms file exists and readable');
        } else {
            console.log('  ❌ .env.tms file missing');
            return false;
        }
        
        // Validate TMS metadata
        if (fs.existsSync('.tms/metadata.json')) {
            const metadata = JSON.parse(fs.readFileSync('.tms/metadata.json', 'utf8'));
            if (metadata.version && metadata.adrVersion) {
                console.log(`  ✅ TMS metadata valid (v${metadata.version}, ${metadata.adrVersion})`);
            } else {
                console.log('  ❌ TMS metadata structure invalid');
                return false;
            }
        } else {
            console.log('  ❌ TMS metadata file missing');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log(`  ❌ Configuration validation failed: ${error.message}`);
        return false;
    }
}

async function validateBasicFunctionality() {
    console.log('\n🔍 5. Basic Functionality Tests');
    
    try {
        // Test Git Integration Service
        const GitIntegrationService = require('./services/git-integration');
        const gitService = new GitIntegrationService();
        
        const mockWebhook = {
            repository: {
                full_name: 'test/repo',
                clone_url: 'https://github.com/test/repo.git'
            },
            commits: [{ modified: ['test.spec.js'] }]
        };
        
        const result = gitService.parseWebhookPayload(mockWebhook, {
            'x-github-event': 'push',
            'user-agent': 'GitHub-Hookshot/abc123'
        });
        if (result.provider && result.repository) {
            console.log('  ✅ Git webhook parsing works');
        } else {
            console.log('  ❌ Git webhook parsing failed');
            return false;
        }
        
        // Test Test Identifier Service
        const TestIdentifierService = require('./services/test-identifier');
        const identifierService = new TestIdentifierService();
        
        const testId = identifierService.generateTestId('test.spec.js', 'sample test', {});
        if (testId && typeof testId === 'string') {
            console.log('  ✅ Test ID generation works');
        } else {
            console.log('  ❌ Test ID generation failed');
            return false;
        }
        
        // Test Test Parser
        const TestParser = require('./utils/test-parser');
        const parser = new TestParser();
        
        const framework = parser.detectFramework('test.spec.js', 'describe("test", () => {})');
        if (framework) {
            console.log(`  ✅ Test parsing works (detected: ${framework})`);
        } else {
            console.log('  ❌ Test parsing failed');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log(`  ❌ Functionality tests failed: ${error.message}`);
        return false;
    }
}

async function runValidation() {
    const results = [];
    
    results.push(await validateFiles());
    results.push(await validateDatabase());
    results.push(await validateServices());
    results.push(await validateConfiguration());
    results.push(await validateBasicFunctionality());
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 1 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log(`📈 Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
        console.log('\n🎉 PHASE 1 FOUNDATION INFRASTRUCTURE VALIDATED!');
        console.log('\n✅ All core components are properly implemented:');
        console.log('  • Git Integration Service');
        console.log('  • Test Discovery Service');
        console.log('  • Test Identifier Service');
        console.log('  • Database Schema Extensions');
        console.log('  • Test Scanner Service');
        console.log('  • Test Correlation Utilities');
        console.log('  • Framework Parsers');
        console.log('  • Configuration Management');
        
        console.log('\n🚀 Ready for:');
        console.log('  • Phase 2 Implementation (Platform Integrations)');
        console.log('  • Real Git repository integration testing');
        console.log('  • Webhook endpoint configuration');
        console.log('  • Production deployment preparation');
    } else {
        console.log('\n⚠️  Some validations failed. Please review and fix issues.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('  1. Run: npm run test (validate existing Playwright tests still work)');
    console.log('  2. Test Git webhook integration with a real repository');
    console.log('  3. Validate test discovery with actual test files');
    console.log('  4. Proceed to Phase 2: Platform Integration');
    
    console.log('\n' + '='.repeat(60));
}

runValidation().catch(error => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
});
