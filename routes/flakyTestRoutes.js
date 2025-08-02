const express = require('express');
const router = express.Router();
const FlakyTestDetectionService = require('../services/flakyTestDetectionService');
const FlakyTestNotificationService = require('../services/flakyTestNotificationService');

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Initialize services
let flakyTestService = null;
let notificationService = null;

const initializeFlakyTestService = (db) => {
  if (!flakyTestService) {
    flakyTestService = new FlakyTestDetectionService(db);
  }
  return flakyTestService;
};

const initializeNotificationService = () => {
  if (!notificationService) {
    notificationService = new FlakyTestNotificationService();
  }
  return notificationService;
};

// Get all flaky tests with their current status
router.get('/tests', requireAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const service = initializeFlakyTestService(db);
    
    const flakyTests = await db.getFlakyTests();
    const statistics = await db.getFlakyTestStatistics();
    
    res.json({
      success: true,
      statistics,
      tests: flakyTests,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching flaky tests:', error);
    res.status(500).json({ error: 'Failed to fetch flaky tests' });
  }
});

// Get detailed analysis for a specific test
router.get('/tests/:testName/analysis', requireAuth, async (req, res) => {
  try {
    const { testName } = req.params;
    const db = req.app.locals.db;
    const service = initializeFlakyTestService(db);
    
    const analysis = await service.analyzeTestFlakiness(testName);
    const stabilityMetrics = await db.getTestStabilityMetrics(testName, 30);
    const executionHistory = await db.getTestExecutionHistory(testName, 50);
    
    res.json({
      success: true,
      testName,
      analysis,
      stabilityMetrics,
      executionHistory: executionHistory.slice(0, 20), // Limit to recent 20 executions
      totalExecutions: executionHistory.length
    });
  } catch (error) {
    console.error(`Error analyzing test ${req.params.testName}:`, error);
    res.status(500).json({ error: 'Failed to analyze test' });
  }
});

// Run flaky test analysis for all tests
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const service = initializeFlakyTestService(db);
    const { analysisType = 'full' } = req.body;
    
    const startTime = new Date();
    console.log('Starting flaky test analysis...');
    
    // Run the analysis
    const analysisResult = await service.analyzeAllTests();
    
    const endTime = new Date();
    const durationMs = endTime - startTime;
    
    // Record the analysis run
    const runData = {
      analysisType,
      totalTests: analysisResult.totalTests,
      flakyTestsFound: analysisResult.flakyTests,
      potentiallyFlakyTests: analysisResult.potentiallyFlakyTests,
      stableTests: analysisResult.stableTests,
      analysisDurationMs: durationMs,
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString()
    };
    
    await db.createFlakyAnalysisRun(runData);
    
    // Update flaky test tracking for each analyzed test
    const notifications = initializeNotificationService();
    
    for (const result of analysisResult.results) {
      if (result.status === 'analyzed') {
        await service.updateFlakyTestTracking(result.testName, result);
        
        // Generate notifications for newly detected flaky tests
        if (result.flakiness && result.flakiness.classification === 'flaky') {
          notifications.notifyFlakyTestDetected(
            result.testName,
            result.flakiness.score,
            result.flakiness.classification
          );
        }
      }
    }
    
    // Generate overall analysis notification
    notifications.notifyAnalysisCompleted(analysisResult);
    
    // Check for notification triggers
    notifications.checkNotificationTriggers(analysisResult);
    
    console.log(`Flaky test analysis completed in ${durationMs}ms`);
    
    res.json({
      success: true,
      analysisResult,
      duration: `${durationMs}ms`,
      timestamp: endTime.toISOString()
    });
  } catch (error) {
    console.error('Error running flaky test analysis:', error);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

// Run analysis for a specific test
router.post('/tests/:testName/analyze', requireAuth, async (req, res) => {
  try {
    const { testName } = req.params;
    const db = req.app.locals.db;
    const service = initializeFlakyTestService(db);
    
    console.log(`Analyzing flakiness for test: ${testName}`);
    
    const analysis = await service.analyzeTestFlakiness(testName);
    
    if (analysis.status === 'analyzed') {
      await service.updateFlakyTestTracking(testName, analysis);
    }
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error analyzing test ${req.params.testName}:`, error);
    res.status(500).json({ error: 'Failed to analyze test' });
  }
});

// Get flaky test statistics and dashboard data
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    const [statistics, recentRuns, flakyTests] = await Promise.all([
      db.getFlakyTestStatistics(),
      db.getRecentFlakyAnalysisRuns(5),
      db.getFlakyTests()
    ]);
    
    // Calculate trend data
    const flakyTestsByClassification = {
      flaky: flakyTests.filter(t => t.classification === 'flaky'),
      potentially_flaky: flakyTests.filter(t => t.classification === 'potentially_flaky'),
      unstable: flakyTests.filter(t => t.classification === 'unstable'),
      stable: flakyTests.filter(t => t.classification === 'stable')
    };
    
    // Get top flaky tests
    const topFlakyTests = flakyTests
      .filter(t => t.flaky_score > 0.2)
      .sort((a, b) => b.flaky_score - a.flaky_score)
      .slice(0, 10);
    
    res.json({
      success: true,
      statistics,
      recentRuns,
      flakyTestsByClassification,
      topFlakyTests,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching flaky test dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get test execution history for a specific test
router.get('/tests/:testName/history', requireAuth, async (req, res) => {
  try {
    const { testName } = req.params;
    const { limit = 50 } = req.query;
    const db = req.app.locals.db;
    
    const executionHistory = await db.getTestExecutionHistory(testName, parseInt(limit));
    const stabilityMetrics = await db.getTestStabilityMetrics(testName, 30);
    
    res.json({
      success: true,
      testName,
      executionHistory,
      stabilityMetrics,
      totalRecords: executionHistory.length
    });
  } catch (error) {
    console.error(`Error fetching execution history for ${req.params.testName}:`, error);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

// Record test execution result (for integration with test runners)
router.post('/tests/execution', requireAuth, async (req, res) => {
  try {
    const testData = req.body;
    const db = req.app.locals.db;
    
    // Validate required fields
    if (!testData.testName || !testData.outcome) {
      return res.status(400).json({ 
        error: 'Missing required fields: testName, outcome' 
      });
    }
    
    // Create test execution record
    const executionRecord = await db.createTestExecutionRecord({
      testName: testData.testName,
      testSuite: testData.testSuite,
      outcome: testData.outcome, // 'passed', 'failed', 'skipped'
      durationMs: testData.durationMs,
      errorMessage: testData.errorMessage,
      stackTrace: testData.stackTrace,
      environment: testData.environment,
      browser: testData.browser,
      executionId: testData.executionId,
      buildId: testData.buildId,
      startedAt: testData.startedAt,
      completedAt: testData.completedAt
    });
    
    console.log(`Recorded test execution: ${testData.testName} - ${testData.outcome}`);
    
    res.json({
      success: true,
      executionRecord,
      message: 'Test execution recorded successfully'
    });
  } catch (error) {
    console.error('Error recording test execution:', error);
    res.status(500).json({ error: 'Failed to record test execution' });
  }
});

// Get analysis run history
router.get('/analysis-runs', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const db = req.app.locals.db;
    
    const analysisRuns = await db.getRecentFlakyAnalysisRuns(parseInt(limit));
    
    res.json({
      success: true,
      analysisRuns,
      totalRuns: analysisRuns.length
    });
  } catch (error) {
    console.error('Error fetching analysis runs:', error);
    res.status(500).json({ error: 'Failed to fetch analysis runs' });
  }
});

// Update flaky test classification manually
router.put('/tests/:testName/classification', requireAuth, async (req, res) => {
  try {
    const { testName } = req.params;
    const { classification, notes } = req.body;
    const db = req.app.locals.db;
    
    // Validate classification
    const validClassifications = ['stable', 'unstable', 'potentially_flaky', 'flaky'];
    if (!validClassifications.includes(classification)) {
      return res.status(400).json({ 
        error: 'Invalid classification. Must be one of: ' + validClassifications.join(', ')
      });
    }
    
    // Get existing flaky test record
    const existingTest = await db.getFlakyTestByName(testName);
    
    if (!existingTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Update the classification
    const updateData = {
      testName,
      flakyScore: existingTest.flaky_score,
      classification,
      confidence: existingTest.confidence,
      patternType: existingTest.pattern_type,
      analysisData: {
        ...existingTest.analysis_data,
        manualClassification: {
          classification,
          notes,
          updatedBy: req.session.username,
          updatedAt: new Date().toISOString()
        }
      }
    };
    
    await db.upsertFlakyTest(updateData);
    
    console.log(`Updated classification for ${testName} to ${classification} by ${req.session.username}`);
    
    res.json({
      success: true,
      message: 'Test classification updated successfully',
      testName,
      newClassification: classification
    });
  } catch (error) {
    console.error(`Error updating classification for ${req.params.testName}:`, error);
    res.status(500).json({ error: 'Failed to update test classification' });
  }
});

// Notification endpoints
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    const notifications = initializeNotificationService();
    
    const notificationList = notifications.getNotifications(
      parseInt(limit),
      unreadOnly === 'true'
    );
    
    res.json({
      success: true,
      notifications: notificationList,
      unreadCount: notifications.getUnreadCount(),
      totalCount: notificationList.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notifications = initializeNotificationService();
    
    const success = notifications.markAsRead(notificationId);
    
    if (success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    const notifications = initializeNotificationService();
    const count = notifications.markAllAsRead();
    
    res.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      markedCount: count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;