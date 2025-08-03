const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Test Discovery Service
 * Scans repositories and files to discover and analyze test code
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestDiscoveryService extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.testFilePatterns = [
      /\.spec\.(js|ts|jsx|tsx)$/,
      /\.test\.(js|ts|jsx|tsx)$/,
      /\.e2e\.(js|ts)$/
    ];
    this.testDirectoryPatterns = [
      /^tests?\//,
      /\/__tests__\//,
      /\/specs?\//,
      /\/e2e\//
    ];
  }

  /**
   * Scan a repository for test files and extract metadata
   */
  async scanRepository(repositoryPath, repositoryId) {
    try {
      console.log(`🔍 Scanning repository: ${repositoryPath}`);
      
      const testFiles = await this.findTestFiles(repositoryPath);
      console.log(`📁 Found ${testFiles.length} test files`);
      
      const discoveredTests = [];
      
      for (const testFile of testFiles) {
        try {
          const tests = await this.analyzeTestFile(testFile, repositoryPath, repositoryId);
          discoveredTests.push(...tests);
        } catch (error) {
          console.error(`❌ Error analyzing test file ${testFile}:`, error.message);
        }
      }
      
      console.log(`✅ Discovered ${discoveredTests.length} tests`);
      
      // Store discovered tests in database
      for (const test of discoveredTests) {
        await this.storeTestMetadata(test);
      }
      
      this.emit('repository-scanned', {
        repositoryId,
        repositoryPath,
        testFilesCount: testFiles.length,
        testsCount: discoveredTests.length,
        timestamp: new Date()
      });
      
      return {
        testFiles: testFiles.length,
        tests: discoveredTests.length,
        discovered: discoveredTests
      };
      
    } catch (error) {
      console.error('Repository scan error:', error);
      throw error;
    }
  }

  /**
   * Find all test files in a repository
   */
  async findTestFiles(repositoryPath, currentPath = '') {
    const testFiles = [];
    const fullPath = path.join(repositoryPath, currentPath);
    
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const fullItemPath = path.join(repositoryPath, itemPath);
        
        if (item.isDirectory()) {
          // Skip node_modules and other common directories to ignore
          if (!this.shouldSkipDirectory(item.name)) {
            const subFiles = await this.findTestFiles(repositoryPath, itemPath);
            testFiles.push(...subFiles);
          }
        } else if (item.isFile()) {
          if (this.isTestFile(itemPath)) {
            testFiles.push(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${fullPath}:`, error.message);
    }
    
    return testFiles;
  }

  /**
   * Check if a file is a test file based on patterns
   */
  isTestFile(filePath) {
    return this.testFilePatterns.some(pattern => pattern.test(filePath)) ||
           this.testDirectoryPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if a directory should be skipped during scanning
   */
  shouldSkipDirectory(dirName) {
    const skipPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      'test-results',
      'playwright-report'
    ];
    
    return skipPatterns.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Analyze a test file to extract test metadata
   */
  async analyzeTestFile(filePath, repositoryPath, repositoryId) {
    try {
      const fullPath = path.join(repositoryPath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      return await this.parseTestContent(content, filePath, repositoryId);
    } catch (error) {
      console.error(`Error analyzing test file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse test file content to extract test cases
   */
  async parseTestContent(content, filePath, repositoryId) {
    const tests = [];
    
    // Regular expressions to match different test patterns
    const testPatterns = [
      // Playwright/Jest style: test('name', ...)
      /test\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // Playwright/Jest style: test.only('name', ...)
      /test\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // describe/it style: it('name', ...)
      /it\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // describe/it style: it.only('name', ...)
      /it\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // Mocha style
      /describe\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];
    
    // Extract describe blocks for context
    const describeBlocks = [];
    const describePattern = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let describeMatch;
    while ((describeMatch = describePattern.exec(content)) !== null) {
      describeBlocks.push({
        name: describeMatch[1],
        index: describeMatch.index
      });
    }
    
    // Extract individual tests
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        
        // Find the closest describe block for context
        const context = this.findTestContext(testIndex, describeBlocks);
        
        // Generate unique test ID
        const testId = this.generateTestId(filePath, testName, context);
        
        // Extract test metadata
        const testMetadata = {
          test_id: testId,
          file_path: filePath,
          test_name: testName,
          description: context ? `${context} - ${testName}` : testName,
          tags: this.extractTags(content, testIndex),
          priority: this.determinePriority(testName, content, testIndex),
          owner: await this.determineOwner(filePath),
          repository_id: repositoryId,
          line_number: this.getLineNumber(content, testIndex),
          test_type: this.determineTestType(filePath, testName),
          framework: this.detectTestFramework(content)
        };
        
        tests.push(testMetadata);
      }
    }
    
    return tests;
  }

  /**
   * Find the describe block context for a test
   */
  findTestContext(testIndex, describeBlocks) {
    let context = null;
    let closestDistance = Infinity;
    
    for (const block of describeBlocks) {
      if (block.index < testIndex) {
        const distance = testIndex - block.index;
        if (distance < closestDistance) {
          closestDistance = distance;
          context = block.name;
        }
      }
    }
    
    return context;
  }

  /**
   * Generate unique test identifier
   */
  generateTestId(filePath, testName, context = null) {
    const signature = context ? 
      `${filePath}:${context}:${testName}` : 
      `${filePath}:${testName}`;
      
    return crypto.createHash('sha256')
      .update(signature)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Extract tags from test content
   */
  extractTags(content, testIndex) {
    const tags = [];
    
    // Look for @tags in comments near the test
    const beforeTest = content.substring(Math.max(0, testIndex - 500), testIndex);
    const tagPattern = /@(\w+)/g;
    let tagMatch;
    
    while ((tagMatch = tagPattern.exec(beforeTest)) !== null) {
      tags.push(tagMatch[1]);
    }
    
    return tags;
  }

  /**
   * Determine test priority based on name and context
   */
  determinePriority(testName, content, testIndex) {
    const lowerName = testName.toLowerCase();
    
    if (lowerName.includes('critical') || lowerName.includes('high')) {
      return 'high';
    }
    if (lowerName.includes('low') || lowerName.includes('optional')) {
      return 'low';
    }
    
    // Check for priority comments
    const beforeTest = content.substring(Math.max(0, testIndex - 200), testIndex);
    if (/@priority\s+(high|medium|low)/i.test(beforeTest)) {
      return RegExp.$1.toLowerCase();
    }
    
    return 'medium';
  }

  /**
   * Determine test owner from file path or git blame
   */
  async determineOwner(filePath) {
    // For now, return null - this could be enhanced with git blame analysis
    return null;
  }

  /**
   * Get line number for a test
   */
  getLineNumber(content, index) {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  /**
   * Determine test type based on file path and name
   */
  determineTestType(filePath, testName) {
    if (filePath.includes('e2e') || filePath.includes('integration')) {
      return 'e2e';
    }
    if (filePath.includes('unit')) {
      return 'unit';
    }
    if (testName.toLowerCase().includes('integration')) {
      return 'integration';
    }
    
    return 'functional';
  }

  /**
   * Detect test framework from content
   */
  detectTestFramework(content) {
    if (content.includes('@playwright/test')) {
      return 'playwright';
    }
    if (content.includes('jest')) {
      return 'jest';
    }
    if (content.includes('mocha')) {
      return 'mocha';
    }
    if (content.includes('cypress')) {
      return 'cypress';
    }
    
    return 'unknown';
  }

  /**
   * Store test metadata in database
   */
  async storeTestMetadata(testMetadata) {
    try {
      await this.db.createOrUpdateTestMetadata(testMetadata);
    } catch (error) {
      console.error('Error storing test metadata:', error);
      throw error;
    }
  }

  /**
   * Rescan a specific test file
   */
  async rescanTestFile(filePath, repositoryPath, repositoryId) {
    try {
      console.log(`🔄 Rescanning test file: ${filePath}`);
      
      const tests = await this.analyzeTestFile(filePath, repositoryPath, repositoryId);
      
      // Remove existing tests for this file
      await this.db.removeTestsByFilePath(repositoryId, filePath);
      
      // Store new test metadata
      for (const test of tests) {
        await this.storeTestMetadata(test);
      }
      
      this.emit('test-file-rescanned', {
        repositoryId,
        filePath,
        testsCount: tests.length,
        timestamp: new Date()
      });
      
      return tests;
    } catch (error) {
      console.error(`Error rescanning test file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get test metadata for a repository
   */
  async getRepositoryTests(repositoryId) {
    return await this.db.getTestsByRepository(repositoryId);
  }

  /**
   * Search tests by criteria
   */
  async searchTests(criteria) {
    return await this.db.searchTests(criteria);
  }
}

module.exports = TestDiscoveryService;
