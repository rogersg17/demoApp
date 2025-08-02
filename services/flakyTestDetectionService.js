const Database = require('../database/database');

class FlakyTestDetectionService {
  constructor(database) {
    this.db = database;
    this.thresholds = {
      minExecutions: 5,          // Minimum test executions to analyze
      flakyPassRateMin: 0.2,     // 20% pass rate lower bound
      flakyPassRateMax: 0.8,     // 80% pass rate upper bound
      instabilityWindow: 20,     // Number of recent executions to analyze
      consecutiveFlipThreshold: 3, // Number of consecutive pass/fail flips
      environmentVariationThreshold: 0.3, // 30% variation across environments
      timeBasedVariationThreshold: 0.25    // 25% variation across time periods
    };
  }

  /**
   * Calculate pass rate for a test over recent executions
   */
  calculatePassRate(testResults) {
    if (!testResults || testResults.length === 0) return 1;
    
    const passed = testResults.filter(result => result.outcome === 'passed').length;
    return passed / testResults.length;
  }

  /**
   * Calculate consistency score based on result patterns
   */
  calculateConsistencyScore(testResults) {
    if (!testResults || testResults.length < 2) return 1;
    
    let consecutiveFlips = 0;
    let maxConsecutiveFlips = 0;
    
    for (let i = 1; i < testResults.length; i++) {
      const current = testResults[i].outcome;
      const previous = testResults[i - 1].outcome;
      
      if (current !== previous) {
        consecutiveFlips++;
        maxConsecutiveFlips = Math.max(maxConsecutiveFlips, consecutiveFlips);
      } else {
        consecutiveFlips = 0;
      }
    }
    
    // Higher flip count = lower consistency
    const flipPenalty = Math.min(maxConsecutiveFlips / this.thresholds.consecutiveFlipThreshold, 1);
    return 1 - flipPenalty;
  }

  /**
   * Analyze failure patterns to identify specific issues
   */
  analyzeFailurePatterns(testResults) {
    if (!testResults || testResults.length === 0) return { score: 1, patterns: [] };
    
    const failures = testResults.filter(result => result.outcome === 'failed');
    const patterns = [];
    let patternScore = 1;
    
    if (failures.length === 0) return { score: 1, patterns: [] };
    
    // Analyze error messages for common patterns
    const errorGroups = this.groupByErrorPattern(failures);
    
    // Timeout patterns
    const timeoutFailures = failures.filter(f => 
      f.error_message && f.error_message.toLowerCase().includes('timeout')
    );
    if (timeoutFailures.length > 0) {
      patterns.push({
        type: 'timeout',
        count: timeoutFailures.length,
        percentage: (timeoutFailures.length / failures.length) * 100,
        description: 'Test failures due to timeouts'
      });
      patternScore -= 0.2;
    }
    
    // Network/connection patterns
    const networkFailures = failures.filter(f => 
      f.error_message && (
        f.error_message.toLowerCase().includes('network') ||
        f.error_message.toLowerCase().includes('connection') ||
        f.error_message.toLowerCase().includes('fetch')
      )
    );
    if (networkFailures.length > 0) {
      patterns.push({
        type: 'network',
        count: networkFailures.length,
        percentage: (networkFailures.length / failures.length) * 100,
        description: 'Test failures due to network issues'
      });
      patternScore -= 0.15;
    }
    
    // Element not found patterns (race conditions)
    const elementFailures = failures.filter(f => 
      f.error_message && (
        f.error_message.toLowerCase().includes('element') ||
        f.error_message.toLowerCase().includes('selector') ||
        f.error_message.toLowerCase().includes('not found')
      )
    );
    if (elementFailures.length > 0) {
      patterns.push({
        type: 'element_timing',
        count: elementFailures.length,
        percentage: (elementFailures.length / failures.length) * 100,
        description: 'Test failures due to element timing issues'
      });
      patternScore -= 0.25;
    }
    
    // Data dependency patterns
    const dataFailures = failures.filter(f => 
      f.error_message && (
        f.error_message.toLowerCase().includes('data') ||
        f.error_message.toLowerCase().includes('expected') ||
        f.error_message.toLowerCase().includes('assertion')
      )
    );
    if (dataFailures.length > 0) {
      patterns.push({
        type: 'data_dependency',
        count: dataFailures.length,
        percentage: (dataFailures.length / failures.length) * 100,
        description: 'Test failures due to data dependency issues'
      });
      patternScore -= 0.1;
    }
    
    return { 
      score: Math.max(patternScore, 0),
      patterns,
      errorGroups: Object.keys(errorGroups).length
    };
  }

  /**
   * Group failures by similar error patterns
   */
  groupByErrorPattern(failures) {
    const groups = {};
    
    failures.forEach(failure => {
      const errorMessage = failure.error_message || 'Unknown error';
      
      // Normalize error message for grouping
      const normalizedError = errorMessage
        .replace(/\d+/g, 'N')  // Replace numbers
        .replace(/['"][^'"]*['"]/g, 'STRING')  // Replace string literals
        .replace(/at\s+.*$/gm, '')  // Remove stack trace lines
        .trim();
      
      if (!groups[normalizedError]) {
        groups[normalizedError] = [];
      }
      groups[normalizedError].push(failure);
    });
    
    return groups;
  }

  /**
   * Calculate environment-based variation
   */
  calculateEnvironmentVariation(testResults) {
    if (!testResults || testResults.length === 0) return 0;
    
    const envGroups = {};
    testResults.forEach(result => {
      const env = result.environment || 'default';
      if (!envGroups[env]) envGroups[env] = [];
      envGroups[env].push(result);
    });
    
    const envCount = Object.keys(envGroups).length;
    if (envCount < 2) return 0;
    
    const envPassRates = Object.values(envGroups).map(results => 
      this.calculatePassRate(results)
    );
    
    const maxRate = Math.max(...envPassRates);
    const minRate = Math.min(...envPassRates);
    
    return maxRate - minRate;
  }

  /**
   * Calculate time-based variation
   */
  calculateTimeBasedVariation(testResults) {
    if (!testResults || testResults.length === 0) return 0;
    
    // Group by day
    const timeGroups = {};
    testResults.forEach(result => {
      const date = new Date(result.created_at).toDateString();
      if (!timeGroups[date]) timeGroups[date] = [];
      timeGroups[date].push(result);
    });
    
    const timeCount = Object.keys(timeGroups).length;
    if (timeCount < 2) return 0;
    
    const timePassRates = Object.values(timeGroups).map(results => 
      this.calculatePassRate(results)
    );
    
    const maxRate = Math.max(...timePassRates);
    const minRate = Math.min(...timePassRates);
    
    return maxRate - minRate;
  }

  /**
   * Calculate overall flaky score for a test
   */
  calculateFlakyScore(testHistory) {
    if (!testHistory || testHistory.length < this.thresholds.minExecutions) {
      return {
        score: 0,
        classification: 'insufficient_data',
        confidence: 0,
        analysis: {
          passRate: null,
          consistencyScore: null,
          patternAnalysis: null,
          environmentVariation: null,
          timeVariation: null
        }
      };
    }
    
    // Limit to recent executions for analysis
    const recentHistory = testHistory
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, this.thresholds.instabilityWindow);
    
    const passRate = this.calculatePassRate(recentHistory);
    const consistencyScore = this.calculateConsistencyScore(recentHistory);
    const patternAnalysis = this.analyzeFailurePatterns(recentHistory);
    const environmentVariation = this.calculateEnvironmentVariation(recentHistory);
    const timeVariation = this.calculateTimeBasedVariation(recentHistory);
    
    // Calculate weighted flaky score
    const passRateScore = this.getPassRateScore(passRate);
    const patternScore = patternAnalysis.score;
    
    // Weight components
    const weights = {
      passRate: 0.4,
      consistency: 0.3,
      patterns: 0.2,
      environment: 0.05,
      time: 0.05
    };
    
    const flakyScore = (
      (1 - passRateScore) * weights.passRate +
      (1 - consistencyScore) * weights.consistency +
      (1 - patternScore) * weights.patterns +
      environmentVariation * weights.environment +
      timeVariation * weights.time
    );
    
    // Determine classification
    let classification = 'stable';
    let confidence = testHistory.length / this.thresholds.instabilityWindow;
    
    if (flakyScore > 0.7) {
      classification = 'flaky';
    } else if (flakyScore > 0.4) {
      classification = 'potentially_flaky';
    } else if (flakyScore > 0.2) {
      classification = 'unstable';
    }
    
    return {
      score: Math.round(flakyScore * 100) / 100,
      classification,
      confidence: Math.min(confidence, 1),
      analysis: {
        passRate,
        consistencyScore,
        patternAnalysis,
        environmentVariation,
        timeVariation,
        recentExecutions: recentHistory.length,
        totalExecutions: testHistory.length
      }
    };
  }

  /**
   * Get pass rate contribution to flaky score
   */
  getPassRateScore(passRate) {
    if (passRate >= this.thresholds.flakyPassRateMin && 
        passRate <= this.thresholds.flakyPassRateMax) {
      // In flaky range - higher score
      return 0.8;
    } else if (passRate === 0 || passRate === 1) {
      // Completely failing or passing - stable
      return 0;
    } else {
      // Partially flaky but outside main range
      return 0.3;
    }
  }

  /**
   * Generate recommendations for test stabilization
   */
  generateRecommendations(testName, flakyAnalysis) {
    const recommendations = [];
    const { analysis } = flakyAnalysis;
    
    if (!analysis.patternAnalysis) return recommendations;
    
    // Timeout-based recommendations
    const timeoutPattern = analysis.patternAnalysis.patterns.find(p => p.type === 'timeout');
    if (timeoutPattern && timeoutPattern.percentage > 30) {
      recommendations.push({
        type: 'timeout',
        priority: 'high',
        title: 'Increase Test Timeouts',
        description: `${timeoutPattern.percentage.toFixed(1)}% of failures are timeout-related. Consider increasing timeout values or optimizing test performance.`,
        actionItems: [
          'Review and increase timeout values for slow operations',
          'Optimize page load and element wait strategies',
          'Consider using explicit waits instead of fixed delays'
        ]
      });
    }
    
    // Network-based recommendations
    const networkPattern = analysis.patternAnalysis.patterns.find(p => p.type === 'network');
    if (networkPattern && networkPattern.percentage > 20) {
      recommendations.push({
        type: 'network',
        priority: 'medium',
        title: 'Improve Network Resilience',
        description: `${networkPattern.percentage.toFixed(1)}% of failures are network-related. Implement retry logic and better error handling.`,
        actionItems: [
          'Add retry logic for network requests',
          'Implement proper error handling for API calls',
          'Consider using test data mocking for unreliable external services'
        ]
      });
    }
    
    // Element timing recommendations
    const elementPattern = analysis.patternAnalysis.patterns.find(p => p.type === 'element_timing');
    if (elementPattern && elementPattern.percentage > 25) {
      recommendations.push({
        type: 'element_timing',
        priority: 'high',
        title: 'Fix Element Timing Issues',
        description: `${elementPattern.percentage.toFixed(1)}% of failures are element timing-related. Improve wait strategies.`,
        actionItems: [
          'Use explicit waits for element visibility/interactability',
          'Avoid hard-coded sleep statements',
          'Implement proper element state checking before interactions'
        ]
      });
    }
    
    // Data dependency recommendations
    const dataPattern = analysis.patternAnalysis.patterns.find(p => p.type === 'data_dependency');
    if (dataPattern && dataPattern.percentage > 20) {
      recommendations.push({
        type: 'data_dependency',
        priority: 'medium',
        title: 'Resolve Data Dependencies',
        description: `${dataPattern.percentage.toFixed(1)}% of failures are data-related. Improve test data management.`,
        actionItems: [
          'Implement proper test data setup and teardown',
          'Use isolated test data that doesn\'t depend on external state',
          'Consider using data factories for consistent test scenarios'
        ]
      });
    }
    
    // Environment variation recommendations
    if (analysis.environmentVariation > this.thresholds.environmentVariationThreshold) {
      recommendations.push({
        type: 'environment',
        priority: 'medium',
        title: 'Standardize Environment Configuration',
        description: `Test shows ${(analysis.environmentVariation * 100).toFixed(1)}% variation across environments.`,
        actionItems: [
          'Review environment-specific configurations',
          'Ensure consistent test data across environments',
          'Standardize browser and system configurations'
        ]
      });
    }
    
    // General consistency recommendations
    if (analysis.consistencyScore < 0.5) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        title: 'Improve Test Stability',
        description: 'Test shows inconsistent behavior patterns that suggest fundamental stability issues.',
        actionItems: [
          'Review test logic for race conditions',
          'Implement proper synchronization mechanisms',
          'Consider breaking down complex test scenarios into smaller, focused tests'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Analyze a specific test for flakiness
   */
  async analyzeTestFlakiness(testName, limit = 50) {
    try {
      // Get test execution history from database
      const testHistory = await this.getTestExecutionHistory(testName, limit);
      
      if (!testHistory || testHistory.length === 0) {
        return {
          testName,
          status: 'no_data',
          message: 'No execution history found for this test'
        };
      }
      
      const flakyAnalysis = this.calculateFlakyScore(testHistory);
      const recommendations = this.generateRecommendations(testName, flakyAnalysis);
      
      return {
        testName,
        status: 'analyzed',
        flakiness: flakyAnalysis,
        recommendations,
        lastAnalyzed: new Date().toISOString(),
        historyCount: testHistory.length
      };
      
    } catch (error) {
      console.error(`Error analyzing test flakiness for ${testName}:`, error);
      return {
        testName,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get test execution history from database
   */
  async getTestExecutionHistory(testName, limit = 50) {
    try {
      return await this.db.getTestExecutionHistory(testName, limit);
    } catch (error) {
      console.error(`Error getting test execution history for ${testName}:`, error);
      return [];
    }
  }

  /**
   * Analyze all tests for flakiness
   */
  async analyzeAllTests() {
    try {
      // Get all unique test names from execution history
      const testNames = await this.getAllTestNames();
      
      const results = [];
      for (const testName of testNames) {
        const analysis = await this.analyzeTestFlakiness(testName);
        results.push(analysis);
      }
      
      // Sort by flaky score (highest first)
      results.sort((a, b) => {
        const scoreA = a.flakiness?.score || 0;
        const scoreB = b.flakiness?.score || 0;
        return scoreB - scoreA;
      });
      
      return {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        flakyTests: results.filter(r => r.flakiness?.classification === 'flaky').length,
        potentiallyFlakyTests: results.filter(r => r.flakiness?.classification === 'potentially_flaky').length,
        stableTests: results.filter(r => r.flakiness?.classification === 'stable').length,
        results
      };
      
    } catch (error) {
      console.error('Error analyzing all tests:', error);
      throw error;
    }
  }

  /**
   * Get all unique test names from execution history
   */
  async getAllTestNames() {
    try {
      return await this.db.getAllUniqueTestNames();
    } catch (error) {
      console.error('Error getting all test names:', error);
      return [];
    }
  }

  /**
   * Update flaky test tracking in database
   */
  async updateFlakyTestTracking(testName, analysis) {
    try {
      if (!analysis.flakiness) return;
      
      const flakyData = {
        testName: testName,
        flakyScore: analysis.flakiness.score,
        classification: analysis.flakiness.classification,
        confidence: analysis.flakiness.confidence,
        patternType: this.determinePatternType(analysis.flakiness.analysis.patternAnalysis),
        analysisData: analysis.flakiness.analysis
      };
      
      await this.db.upsertFlakyTest(flakyData);
      console.log(`Updated flaky test tracking for: ${testName}`);
      
    } catch (error) {
      console.error(`Error updating flaky test tracking for ${testName}:`, error);
    }
  }

  /**
   * Determine primary pattern type from analysis
   */
  determinePatternType(patternAnalysis) {
    if (!patternAnalysis?.patterns || patternAnalysis.patterns.length === 0) {
      return 'unknown';
    }
    
    // Return the pattern with highest percentage
    const primaryPattern = patternAnalysis.patterns
      .sort((a, b) => b.percentage - a.percentage)[0];
    
    return primaryPattern.type;
  }
}

module.exports = FlakyTestDetectionService;