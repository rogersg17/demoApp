const crypto = require('crypto');
const path = require('path');

/**
 * Test Identifier Service
 * Generates unique test identifiers and manages test identification
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestIdentifierService {
  constructor() {
    this.identifierCache = new Map();
  }

  /**
   * Generate a unique test identifier
   * Format: {file_hash}-{test_hash}
   */
  generateTestId(filePath, testName, context = null, parameters = null) {
    // Normalize file path (remove leading ./ and use forward slashes)
    const normalizedPath = filePath.replace(/^\.\//, '').replace(/\\/g, '/');
    
    // Create test signature
    const signature = this.createTestSignature(normalizedPath, testName, context, parameters);
    
    // Generate hash-based ID
    const hash = crypto.createHash('sha256')
      .update(signature)
      .digest('hex');
    
    // Use first 16 characters for readability while maintaining uniqueness
    const testId = hash.substring(0, 16);
    
    // Cache the mapping
    this.identifierCache.set(signature, testId);
    
    return testId;
  }

  /**
   * Create a test signature for consistent identification
   */
  createTestSignature(filePath, testName, context = null, parameters = null) {
    const components = [
      filePath,
      testName
    ];
    
    if (context) {
      components.push(context);
    }
    
    if (parameters && typeof parameters === 'object') {
      // Sort parameters for consistency
      const sortedParams = Object.keys(parameters)
        .sort()
        .map(key => `${key}:${parameters[key]}`)
        .join(',');
      components.push(sortedParams);
    }
    
    return components.join('::');
  }

  /**
   * Generate test identifier from test execution data
   */
  generateIdFromExecution(executionData) {
    const { filePath, testName, suite, parameters } = executionData;
    return this.generateTestId(filePath, testName, suite, parameters);
  }

  /**
   * Create a deterministic test identifier that works across platforms
   */
  createCrossPlatformId(testMetadata) {
    const {
      file_path,
      test_name,
      suite_name,
      test_parameters,
      framework
    } = testMetadata;

    // Normalize the file path to handle different OS path separators
    const normalizedPath = this.normalizePath(file_path);
    
    // Create a platform-agnostic signature
    const signature = [
      'test',
      normalizedPath,
      suite_name || '',
      test_name,
      framework || '',
      this.normalizeParameters(test_parameters)
    ].filter(Boolean).join('|');
    
    return crypto.createHash('sha256')
      .update(signature)
      .digest('hex')
      .substring(0, 20); // Slightly longer for cross-platform uniqueness
  }

  /**
   * Normalize file path for cross-platform compatibility
   */
  normalizePath(filePath) {
    if (!filePath) return '';
    
    return filePath
      .replace(/\\/g, '/') // Convert Windows paths to Unix style
      .replace(/^\.\//, '') // Remove leading ./
      .toLowerCase(); // Case-insensitive for consistency
  }

  /**
   * Normalize test parameters for consistent identification
   */
  normalizeParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      return '';
    }
    
    return Object.keys(parameters)
      .sort()
      .map(key => `${key}=${JSON.stringify(parameters[key])}`)
      .join('&');
  }

  /**
   * Extract test identifier from Playwright test title
   */
  extractPlaywrightId(testTitle, testFile) {
    // Playwright test format: "file.spec.ts:line:test title"
    const match = testTitle.match(/^(.+):(\d+):(.+)$/);
    
    if (match) {
      const [, file, line, title] = match;
      return this.generateTestId(file, title);
    }
    
    // Fallback to simple file + title
    return this.generateTestId(testFile, testTitle);
  }

  /**
   * Create test identifier from Jest test
   */
  extractJestId(testPath, testName, ancestorTitles = []) {
    const context = ancestorTitles.length > 0 ? ancestorTitles.join(' > ') : null;
    return this.generateTestId(testPath, testName, context);
  }

  /**
   * Create test identifier from Cypress test
   */
  extractCypressId(specFile, testTitle, suiteTitle = null) {
    return this.generateTestId(specFile, testTitle, suiteTitle);
  }

  /**
   * Parse test identifier to extract components
   */
  parseTestId(testId) {
    // For hash-based IDs, we need to look up in cache or database
    if (this.identifierCache.has(testId)) {
      return this.identifierCache.get(testId);
    }
    
    // Return basic structure
    return {
      id: testId,
      type: 'hash-based',
      length: testId.length
    };
  }

  /**
   * Validate test identifier format
   */
  validateTestId(testId) {
    if (!testId || typeof testId !== 'string') {
      return { valid: false, error: 'Test ID must be a non-empty string' };
    }
    
    if (testId.length < 8) {
      return { valid: false, error: 'Test ID too short' };
    }
    
    if (testId.length > 64) {
      return { valid: false, error: 'Test ID too long' };
    }
    
    if (!/^[a-f0-9]+$/i.test(testId)) {
      return { valid: false, error: 'Test ID must contain only hexadecimal characters' };
    }
    
    return { valid: true };
  }

  /**
   * Generate batch of test identifiers
   */
  generateBatchIds(testDataArray) {
    return testDataArray.map(testData => ({
      ...testData,
      test_id: this.generateTestId(
        testData.file_path,
        testData.test_name,
        testData.context,
        testData.parameters
      )
    }));
  }

  /**
   * Create unique execution identifier
   */
  generateExecutionId(testId, platformType, timestamp = new Date()) {
    const executionSignature = [
      testId,
      platformType,
      timestamp.toISOString(),
      Math.random().toString(36).substring(2, 15) // Add randomness for concurrent executions
    ].join(':');
    
    return crypto.createHash('sha256')
      .update(executionSignature)
      .digest('hex')
      .substring(0, 24);
  }

  /**
   * Correlate test results with stored test metadata
   */
  correlateTestResult(testResult, knownTests) {
    const resultId = this.generateIdFromExecution(testResult);
    
    // Direct match
    const directMatch = knownTests.find(test => test.test_id === resultId);
    if (directMatch) {
      return { match: directMatch, confidence: 1.0, method: 'direct' };
    }
    
    // Fuzzy matching by file path and test name
    const fuzzyMatches = knownTests.filter(test => {
      const pathMatch = test.file_path === testResult.filePath;
      const nameMatch = test.test_name === testResult.testName;
      return pathMatch && nameMatch;
    });
    
    if (fuzzyMatches.length === 1) {
      return { match: fuzzyMatches[0], confidence: 0.9, method: 'fuzzy' };
    }
    
    if (fuzzyMatches.length > 1) {
      // Multiple matches - try to disambiguate by context
      const contextMatch = fuzzyMatches.find(test => 
        test.description && test.description.includes(testResult.suite || '')
      );
      
      if (contextMatch) {
        return { match: contextMatch, confidence: 0.8, method: 'context' };
      }
    }
    
    return { match: null, confidence: 0, method: 'none' };
  }

  /**
   * Clear identifier cache
   */
  clearCache() {
    this.identifierCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.identifierCache.size,
      entries: Array.from(this.identifierCache.keys()).slice(0, 5) // First 5 entries for debugging
    };
  }
}

module.exports = TestIdentifierService;
