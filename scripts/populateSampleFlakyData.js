const Database = require('../database/database');
const FlakyTestDetectionService = require('../services/flakyTestDetectionService');

async function populateSampleFlakyData() {
  const db = new Database();
  const flakyService = new FlakyTestDetectionService(db);

  console.log('🔄 Populating sample flaky test data...');

  // Wait for database to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Sample test names
    const testNames = [
      'login-page-authentication.spec.ts',
      'user-management-crud.spec.ts',
      'dashboard-navigation.spec.ts',
      'api-endpoints-integration.spec.ts',
      'file-upload-functionality.spec.ts',
      'search-and-filter.spec.ts',
      'user-profile-settings.spec.ts',
      'notification-system.spec.ts',
      'data-export-import.spec.ts',
      'responsive-design.spec.ts',
      'security-authentication.spec.ts',
      'performance-load-test.spec.ts',
      'third-party-integration.spec.ts',
      'email-notifications.spec.ts',
      'database-operations.spec.ts'
    ];

    // Generate sample test execution history
    for (const testName of testNames) {
      console.log(`📝 Creating execution history for: ${testName}`);
      
      // Generate 30-50 executions per test with varying patterns
      const executionCount = 30 + Math.floor(Math.random() * 20);
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 30); // Start 30 days ago

      for (let i = 0; i < executionCount; i++) {
        const executionDate = new Date(baseDate);
        executionDate.setHours(executionDate.getHours() + (i * 12)); // Space executions ~12 hours apart

        let outcome;
        let errorMessage = null;
        let durationMs = 2000 + Math.floor(Math.random() * 8000); // 2-10 seconds

        // Create different flaky patterns for different tests
        if (testName.includes('login-page')) {
          // Flaky test with timeout issues
          outcome = Math.random() < 0.65 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = Math.random() < 0.7 ? 
              'TimeoutError: Waiting for selector ".login-button" failed: timeout 30000ms exceeded' :
              'Error: Element not found - Login form not visible within timeout';
            durationMs = 30000; // Timeout duration
          }
        } else if (testName.includes('api-endpoints')) {
          // Network-related flakiness
          outcome = Math.random() < 0.75 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = Math.random() < 0.8 ?
              'NetworkError: fetch failed - ECONNRESET' :
              'Error: Request timeout after 5000ms';
            durationMs = 5000;
          }
        } else if (testName.includes('file-upload')) {
          // Data dependency issues
          outcome = Math.random() < 0.55 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = Math.random() < 0.6 ?
              'AssertionError: Expected file to be uploaded but upload directory is empty' :
              'Error: File validation failed - unexpected file size';
          }
        } else if (testName.includes('responsive-design')) {
          // Element timing issues
          outcome = Math.random() < 0.7 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = 'Error: Element not visible at breakpoint 768px - expected to be visible';
          }
        } else if (testName.includes('performance-load')) {
          // Consistently failing test
          outcome = Math.random() < 0.15 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = 'Performance Error: Page load time 8.5s exceeds threshold of 3s';
            durationMs = 8500;
          }
        } else if (testName.includes('security-authentication')) {
          // Stable test
          outcome = Math.random() < 0.95 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = 'Security validation failed: Invalid token format';
          }
        } else {
          // Moderately stable tests
          outcome = Math.random() < 0.85 ? 'passed' : 'failed';
          if (outcome === 'failed') {
            errorMessage = 'AssertionError: Expected element to contain text "Success" but found "Error"';
          }
        }

        const testData = {
          testName: testName,
          testSuite: testName.split('-')[0] + '-suite',
          outcome: outcome,
          durationMs: durationMs,
          errorMessage: errorMessage,
          stackTrace: errorMessage ? `Error: ${errorMessage}\n    at Test.run (test-runner.js:123:45)\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)` : null,
          environment: ['production', 'staging', 'development'][Math.floor(Math.random() * 3)],
          browser: ['chromium', 'firefox', 'webkit'][Math.floor(Math.random() * 3)],
          executionId: `exec_${Date.now()}_${i}`,
          buildId: `build_${Math.floor(Math.random() * 1000)}`,
          startedAt: executionDate.toISOString(),
          completedAt: new Date(executionDate.getTime() + durationMs).toISOString()
        };

        await db.createTestExecutionRecord(testData);
      }

      // Add some delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Sample test execution data created');

    // Run flaky test analysis on all tests
    console.log('🔍 Running flaky test analysis...');
    const analysisResult = await flakyService.analyzeAllTests();

    console.log(`📊 Analysis completed:`);
    console.log(`  - Total tests: ${analysisResult.totalTests}`);
    console.log(`  - Flaky tests: ${analysisResult.flakyTests}`);
    console.log(`  - Potentially flaky: ${analysisResult.potentiallyFlakyTests}`);
    console.log(`  - Stable tests: ${analysisResult.stableTests}`);

    // Update database with analysis results
    for (const result of analysisResult.results) {
      if (result.status === 'analyzed') {
        await flakyService.updateFlakyTestTracking(result.testName, result);
      }
    }

    // Record the analysis run
    const runData = {
      analysisType: 'sample_data',
      totalTests: analysisResult.totalTests,
      flakyTestsFound: analysisResult.flakyTests,
      potentiallyFlakyTests: analysisResult.potentiallyFlakyTests,
      stableTests: analysisResult.stableTests,
      analysisDurationMs: 5000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    await db.createFlakyAnalysisRun(runData);

    console.log('✅ Flaky test analysis data populated successfully!');
    console.log('🌐 You can now view the flaky tests dashboard at /flaky-tests');

  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  } finally {
    db.close();
    process.exit(0);
  }
}

// Run the script
populateSampleFlakyData();