const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * Test Scanner Service
 * Advanced repository scanning and test file analysis
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestScannerService extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.scanInProgress = new Set();
    this.scanResults = new Map();
  }

  /**
   * Deep scan repository for comprehensive test discovery
   */
  async deepScanRepository(repositoryPath, repositoryId, options = {}) {
    const scanId = `${repositoryId}-${Date.now()}`;
    
    if (this.scanInProgress.has(repositoryId)) {
      throw new Error(`Scan already in progress for repository ${repositoryId}`);
    }

    try {
      this.scanInProgress.add(repositoryId);
      console.log(`🔍 Starting deep scan for repository ${repositoryId}`);

      const scanOptions = {
        includeHidden: options.includeHidden || false,
        maxDepth: options.maxDepth || 10,
        followSymlinks: options.followSymlinks || false,
        scanDependencies: options.scanDependencies || true,
        extractDependencies: options.extractDependencies || true,
        analyzeComplexity: options.analyzeComplexity || false,
        ...options
      };

      const scanResult = {
        scanId,
        repositoryId,
        repositoryPath,
        startTime: new Date(),
        options: scanOptions,
        stats: {
          filesScanned: 0,
          testFilesFound: 0,
          testsDiscovered: 0,
          errors: 0
        },
        results: {
          testFiles: [],
          tests: [],
          dependencies: [],
          configuration: {},
          errors: []
        }
      };

      // Scan for test files
      await this.scanForTestFiles(repositoryPath, scanResult, scanOptions);

      // Analyze test configurations
      await this.analyzeTestConfigurations(repositoryPath, scanResult);

      // Extract test dependencies if requested
      if (scanOptions.scanDependencies) {
        await this.extractTestDependencies(repositoryPath, scanResult);
      }

      // Analyze each test file
      for (const testFile of scanResult.results.testFiles) {
        await this.analyzeTestFile(testFile, repositoryPath, scanResult, scanOptions);
      }

      scanResult.endTime = new Date();
      scanResult.duration = scanResult.endTime - scanResult.startTime;

      this.scanResults.set(scanId, scanResult);
      
      this.emit('deep-scan-completed', {
        scanId,
        repositoryId,
        stats: scanResult.stats,
        duration: scanResult.duration
      });

      console.log(`✅ Deep scan completed for repository ${repositoryId}. Found ${scanResult.stats.testsDiscovered} tests in ${scanResult.stats.testFilesFound} files`);
      
      return scanResult;

    } catch (error) {
      console.error(`❌ Deep scan failed for repository ${repositoryId}:`, error);
      throw error;
    } finally {
      this.scanInProgress.delete(repositoryId);
    }
  }

  /**
   * Scan directory for test files recursively
   */
  async scanForTestFiles(repositoryPath, scanResult, options, currentPath = '', depth = 0) {
    if (depth > options.maxDepth) {
      return;
    }

    const fullPath = path.join(repositoryPath, currentPath);
    
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const fullItemPath = path.join(repositoryPath, itemPath);

        if (item.isDirectory()) {
          if (this.shouldScanDirectory(item.name, options)) {
            await this.scanForTestFiles(repositoryPath, scanResult, options, itemPath, depth + 1);
          }
        } else if (item.isFile()) {
          scanResult.stats.filesScanned++;
          
          if (this.isTestFile(itemPath)) {
            const testFileInfo = await this.extractTestFileInfo(fullItemPath, itemPath);
            scanResult.results.testFiles.push(testFileInfo);
            scanResult.stats.testFilesFound++;
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${fullPath}:`, error);
      scanResult.results.errors.push({
        type: 'directory_scan_error',
        path: fullPath,
        error: error.message
      });
      scanResult.stats.errors++;
    }
  }

  /**
   * Extract basic test file information
   */
  async extractTestFileInfo(fullPath, relativePath) {
    try {
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      return {
        path: relativePath,
        fullPath,
        size: stats.size,
        modified: stats.mtime,
        framework: this.detectTestFramework(content),
        encoding: this.detectEncoding(content),
        lineCount: content.split('\n').length,
        hasAsyncTests: /async\s+\w+\s*\(/.test(content),
        hasDescribeBlocks: /describe\s*\(/.test(content),
        hasTestBlocks: /(?:test|it)\s*\(/.test(content)
      };
    } catch (error) {
      console.error(`Error extracting test file info for ${fullPath}:`, error);
      return {
        path: relativePath,
        fullPath,
        error: error.message
      };
    }
  }

  /**
   * Analyze test configurations in repository
   */
  async analyzeTestConfigurations(repositoryPath, scanResult) {
    const configFiles = [
      'playwright.config.js',
      'playwright.config.ts',
      'jest.config.js',
      'jest.config.ts',
      'vitest.config.js',
      'vitest.config.ts',
      'cypress.config.js',
      'cypress.config.ts',
      'package.json'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(repositoryPath, configFile);
      
      try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, 'utf8');
        
        scanResult.results.configuration[configFile] = {
          exists: true,
          content: configFile === 'package.json' ? this.extractTestScripts(content) : this.extractConfigSettings(content),
          path: configPath
        };
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }
  }

  /**
   * Extract test dependencies from package.json and other sources
   */
  async extractTestDependencies(repositoryPath, scanResult) {
    try {
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      const testDependencies = {};

      // Extract dev dependencies that look like test tools
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          if (this.isTestDependency(name)) {
            testDependencies[name] = version;
          }
        }
      }

      // Extract regular dependencies that might be test-related
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          if (this.isTestDependency(name)) {
            testDependencies[name] = version;
          }
        }
      }

      scanResult.results.dependencies = testDependencies;

    } catch (error) {
      console.error('Error extracting test dependencies:', error);
      scanResult.results.errors.push({
        type: 'dependency_extraction_error',
        error: error.message
      });
    }
  }

  /**
   * Analyze individual test file in detail
   */
  async analyzeTestFile(testFileInfo, repositoryPath, scanResult, options) {
    try {
      const content = await fs.readFile(testFileInfo.fullPath, 'utf8');
      
      const analysis = {
        filePath: testFileInfo.path,
        framework: testFileInfo.framework,
        tests: [],
        imports: this.extractImports(content),
        complexity: options.analyzeComplexity ? this.analyzeComplexity(content) : null,
        coverage: this.estimateCoverage(content),
        patterns: this.detectTestPatterns(content)
      };

      // Extract individual tests
      const tests = this.extractTestsFromContent(content, testFileInfo.path);
      analysis.tests = tests;
      
      scanResult.results.tests.push(...tests);
      scanResult.stats.testsDiscovered += tests.length;

    } catch (error) {
      console.error(`Error analyzing test file ${testFileInfo.path}:`, error);
      scanResult.results.errors.push({
        type: 'test_file_analysis_error',
        file: testFileInfo.path,
        error: error.message
      });
      scanResult.stats.errors++;
    }
  }

  /**
   * Extract imports and dependencies from test file
   */
  extractImports(content) {
    const imports = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        type: 'es6',
        module: match[1]
      });
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        type: 'commonjs',
        module: match[1]
      });
    }

    return imports;
  }

  /**
   * Analyze code complexity (basic implementation)
   */
  analyzeComplexity(content) {
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      linesOfCode: content.split('\n').length,
      functionCount: (content.match(/function\s+\w+/g) || []).length,
      asyncFunctionCount: (content.match(/async\s+function\s+\w+/g) || []).length
    };
  }

  /**
   * Calculate basic cyclomatic complexity
   */
  calculateCyclomaticComplexity(content) {
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try'
    ];
    
    let complexity = 1; // Base complexity
    
    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Estimate test coverage based on test patterns
   */
  estimateCoverage(content) {
    const lines = content.split('\n');
    const testLines = lines.filter(line => 
      /(?:test|it|describe)\s*\(/.test(line) ||
      /expect\s*\(/.test(line) ||
      /assert\s*\(/.test(line)
    ).length;
    
    return {
      estimatedCoverageLines: testLines,
      totalLines: lines.length,
      coverageRatio: testLines / lines.length
    };
  }

  /**
   * Detect test patterns and best practices
   */
  detectTestPatterns(content) {
    return {
      usesDescribeBlocks: /describe\s*\(/.test(content),
      usesBeforeEach: /beforeEach\s*\(/.test(content),
      usesAfterEach: /afterEach\s*\(/.test(content),
      usesAsync: /async\s+\w+\s*\(/.test(content),
      usesAwait: /await\s+/.test(content),
      usesMocks: /mock|jest\.mock|sinon|stub/.test(content),
      usesSnapshots: /toMatchSnapshot|toMatchInlineSnapshot/.test(content),
      hasTimeouts: /timeout|setTimeout|setInterval/.test(content),
      hasRetries: /retry|retries/.test(content)
    };
  }

  /**
   * Extract individual tests from file content
   */
  extractTestsFromContent(content, filePath) {
    const tests = [];
    
    // Multiple patterns for different frameworks
    const testPatterns = [
      { regex: /test\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'test' },
      { regex: /it\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'it' },
      { regex: /test\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'test.modifier' },
      { regex: /it\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'it.modifier' }
    ];

    // Extract describe blocks for context
    const describeBlocks = this.extractDescribeBlocks(content);

    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findTestContext(testIndex, describeBlocks);
        
        tests.push({
          name: testName,
          type: pattern.type,
          filePath,
          context,
          line: this.getLineNumber(content, testIndex),
          async: this.isAsyncTest(content, testIndex),
          modifiers: this.extractTestModifiers(match[0])
        });
      }
    }

    return tests;
  }

  /**
   * Extract describe blocks for context
   */
  extractDescribeBlocks(content) {
    const blocks = [];
    const regex = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        name: match[1],
        index: match.index,
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return blocks;
  }

  /**
   * Find context for a test based on describe blocks
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
   * Check if test is async
   */
  isAsyncTest(content, testIndex) {
    const beforeTest = content.substring(Math.max(0, testIndex - 100), testIndex + 200);
    return /async\s*\([^)]*\)\s*=>/.test(beforeTest) || /async\s+function/.test(beforeTest);
  }

  /**
   * Extract test modifiers (only, skip, etc.)
   */
  extractTestModifiers(testString) {
    const modifiers = [];
    if (testString.includes('.only')) modifiers.push('only');
    if (testString.includes('.skip')) modifiers.push('skip');
    return modifiers;
  }

  /**
   * Get line number from content index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Check if directory should be scanned
   */
  shouldScanDirectory(dirName, options) {
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
    
    if (skipPatterns.includes(dirName)) {
      return false;
    }
    
    if (!options.includeHidden && dirName.startsWith('.')) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if file is a test file
   */
  isTestFile(filePath) {
    const testPatterns = [
      /\.spec\.(js|ts|jsx|tsx)$/,
      /\.test\.(js|ts|jsx|tsx)$/,
      /\.e2e\.(js|ts)$/,
      /tests?\//,
      /__tests__\//,
      /\/specs?\//
    ];
    
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Detect test framework from content
   */
  detectTestFramework(content) {
    const frameworks = [
      { name: 'playwright', patterns: ['@playwright/test', 'test.describe', 'test.beforeEach'] },
      { name: 'jest', patterns: ['jest', 'describe', 'it', 'expect'] },
      { name: 'mocha', patterns: ['mocha', 'describe', 'it', 'chai'] },
      { name: 'cypress', patterns: ['cypress', 'cy.visit', 'cy.get'] },
      { name: 'vitest', patterns: ['vitest', 'vi.mock', 'test'] },
      { name: 'jasmine', patterns: ['jasmine', 'describe', 'it', 'spyOn'] }
    ];
    
    for (const framework of frameworks) {
      if (framework.patterns.some(pattern => content.includes(pattern))) {
        return framework.name;
      }
    }
    
    return 'unknown';
  }

  /**
   * Detect file encoding
   */
  detectEncoding(content) {
    // Simple encoding detection
    try {
      const buffer = Buffer.from(content, 'utf8');
      return buffer.toString('utf8') === content ? 'utf8' : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract test scripts from package.json
   */
  extractTestScripts(content) {
    try {
      const packageJson = JSON.parse(content);
      const scripts = packageJson.scripts || {};
      
      return Object.entries(scripts)
        .filter(([name]) => name.includes('test'))
        .reduce((acc, [name, script]) => {
          acc[name] = script;
          return acc;
        }, {});
    } catch {
      return {};
    }
  }

  /**
   * Extract configuration settings from config files
   */
  extractConfigSettings(content) {
    // Basic extraction - could be enhanced with actual parsing
    return {
      hasPlaywrightConfig: content.includes('playwright'),
      hasJestConfig: content.includes('jest'),
      hasTypeScript: content.includes('typescript') || content.includes('.ts'),
      raw: content.substring(0, 500) // First 500 chars for analysis
    };
  }

  /**
   * Check if dependency is test-related
   */
  isTestDependency(name) {
    const testDependencies = [
      'playwright', 'jest', 'mocha', 'chai', 'cypress', 'vitest',
      'jasmine', 'karma', 'ava', 'tape', 'tap', 'selenium',
      'webdriver', 'puppeteer', 'cheerio', 'sinon', 'nock',
      'supertest', 'enzyme', 'react-testing-library', '@testing-library'
    ];
    
    return testDependencies.some(dep => name.includes(dep));
  }

  /**
   * Get scan results
   */
  getScanResult(scanId) {
    return this.scanResults.get(scanId);
  }

  /**
   * Get all scan results for a repository
   */
  getRepositoryScans(repositoryId) {
    return Array.from(this.scanResults.values())
      .filter(result => result.repositoryId === repositoryId)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Clear old scan results
   */
  clearOldScans(olderThanDays = 7) {
    const cutoff = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    
    for (const [scanId, result] of this.scanResults.entries()) {
      if (result.startTime < cutoff) {
        this.scanResults.delete(scanId);
      }
    }
  }
}

module.exports = TestScannerService;
