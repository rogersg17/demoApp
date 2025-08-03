const TestIdentifierService = require('../services/test-identifier');

/**
 * Test Parser Utilities
 * Utilities for parsing different test file formats and extracting metadata
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestParserUtils {
  constructor() {
    this.testIdentifier = new TestIdentifierService();
    this.supportedFrameworks = [
      'playwright',
      'jest',
      'mocha',
      'cypress',
      'vitest',
      'jasmine'
    ];
  }

  /**
   * Parse test file based on detected framework
   */
  parseTestFile(content, filePath, framework = null) {
    const detectedFramework = framework || this.detectFramework(content);
    
    switch (detectedFramework) {
      case 'playwright':
        return this.parsePlaywrightFile(content, filePath);
      case 'jest':
        return this.parseJestFile(content, filePath);
      case 'mocha':
        return this.parseMochaFile(content, filePath);
      case 'cypress':
        return this.parseCypressFile(content, filePath);
      case 'vitest':
        return this.parseVitestFile(content, filePath);
      default:
        return this.parseGenericFile(content, filePath);
    }
  }

  /**
   * Parse Playwright test file
   */
  parsePlaywrightFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    const config = this.extractPlaywrightConfig(content);
    
    // Extract test blocks
    const testPatterns = [
      /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\{\s*page\s*\}\s*\)\s*=>\s*\{/g,
      /test\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /test\.(?:only|skip|fixme)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const describeBlocks = this.extractDescribeBlocks(content);
    
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findNearestDescribe(testIndex, describeBlocks);
        
        const test = {
          framework: 'playwright',
          name: testName,
          filePath,
          context,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: true, // Playwright tests are typically async
          modifiers: this.extractModifiers(match[0]),
          browsers: this.extractBrowsers(content, testIndex),
          annotations: this.extractAnnotations(content, testIndex),
          testId: this.testIdentifier.generateTestId(filePath, testName, context)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'playwright',
      filePath,
      tests,
      imports,
      config,
      metadata: {
        hasParallelTests: content.includes('test.describe.parallel'),
        hasSerialTests: content.includes('test.describe.serial'),
        hasCustomFixtures: content.includes('test.extend'),
        hasPageObjectPattern: imports.some(imp => imp.module.includes('page-objects'))
      }
    };
  }

  /**
   * Parse Jest test file
   */
  parseJestFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    const mocks = this.extractJestMocks(content);
    
    const testPatterns = [
      /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /(?:test|it)\.(?:only|skip|todo|each)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const describeBlocks = this.extractDescribeBlocks(content);
    
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findNearestDescribe(testIndex, describeBlocks);
        
        const test = {
          framework: 'jest',
          name: testName,
          filePath,
          context,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: this.isAsyncTest(content, testIndex),
          modifiers: this.extractModifiers(match[0]),
          expectations: this.extractExpectations(content, testIndex),
          testId: this.testIdentifier.generateTestId(filePath, testName, context)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'jest',
      filePath,
      tests,
      imports,
      mocks,
      metadata: {
        hasSetup: content.includes('beforeEach') || content.includes('beforeAll'),
        hasTeardown: content.includes('afterEach') || content.includes('afterAll'),
        usesSnapshots: content.includes('toMatchSnapshot'),
        usesMocks: mocks.length > 0
      }
    };
  }

  /**
   * Parse Mocha test file
   */
  parseMochaFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    
    const testPatterns = [
      /it\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /it\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const describeBlocks = this.extractDescribeBlocks(content);
    
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findNearestDescribe(testIndex, describeBlocks);
        
        const test = {
          framework: 'mocha',
          name: testName,
          filePath,
          context,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: this.isAsyncTest(content, testIndex),
          modifiers: this.extractModifiers(match[0]),
          timeout: this.extractTimeout(content, testIndex),
          testId: this.testIdentifier.generateTestId(filePath, testName, context)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'mocha',
      filePath,
      tests,
      imports,
      metadata: {
        hasHooks: content.includes('before') || content.includes('after'),
        usesChai: imports.some(imp => imp.module.includes('chai')),
        hasSuites: describeBlocks.length > 0
      }
    };
  }

  /**
   * Parse Cypress test file
   */
  parseCypressFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    const commands = this.extractCypressCommands(content);
    
    const testPatterns = [
      /it\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /it\.(?:only|skip)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const describeBlocks = this.extractDescribeBlocks(content);
    
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findNearestDescribe(testIndex, describeBlocks);
        
        const test = {
          framework: 'cypress',
          name: testName,
          filePath,
          context,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: false, // Cypress handles async differently
          modifiers: this.extractModifiers(match[0]),
          cypressCommands: this.extractTestCypressCommands(content, testIndex),
          testId: this.testIdentifier.generateTestId(filePath, testName, context)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'cypress',
      filePath,
      tests,
      imports,
      commands,
      metadata: {
        hasCustomCommands: commands.length > 0,
        hasFixtures: content.includes('cy.fixture'),
        hasIntercepts: content.includes('cy.intercept'),
        hasViewportCommands: content.includes('cy.viewport')
      }
    };
  }

  /**
   * Parse Vitest file
   */
  parseVitestFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    const mocks = this.extractVitestMocks(content);
    
    const testPatterns = [
      /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /(?:test|it)\.(?:only|skip|todo|concurrent)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const describeBlocks = this.extractDescribeBlocks(content);
    
    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        const context = this.findNearestDescribe(testIndex, describeBlocks);
        
        const test = {
          framework: 'vitest',
          name: testName,
          filePath,
          context,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: this.isAsyncTest(content, testIndex),
          modifiers: this.extractModifiers(match[0]),
          isConcurrent: match[0].includes('.concurrent'),
          testId: this.testIdentifier.generateTestId(filePath, testName, context)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'vitest',
      filePath,
      tests,
      imports,
      mocks,
      metadata: {
        hasConcurrentTests: content.includes('.concurrent'),
        usesVI: imports.some(imp => imp.module === 'vitest'),
        usesMocks: mocks.length > 0
      }
    };
  }

  /**
   * Parse generic test file
   */
  parseGenericFile(content, filePath) {
    const tests = [];
    const imports = this.extractImports(content);
    
    // Generic test patterns
    const testPatterns = [
      /(?:test|it|should)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /function\s+test(\w+)/g,
      /const\s+test(\w+)\s*=/g
    ];

    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const testName = match[1];
        const testIndex = match.index;
        
        const test = {
          framework: 'generic',
          name: testName,
          filePath,
          lineNumber: this.getLineNumber(content, testIndex),
          isAsync: this.isAsyncTest(content, testIndex),
          testId: this.testIdentifier.generateTestId(filePath, testName)
        };
        
        tests.push(test);
      }
    }

    return {
      framework: 'generic',
      filePath,
      tests,
      imports,
      metadata: {}
    };
  }

  /**
   * Detect test framework from file content
   */
  detectFramework(content) {
    const frameworks = [
      { name: 'playwright', indicators: ['@playwright/test', 'test.describe', 'page.goto'] },
      { name: 'cypress', indicators: ['cypress', 'cy.visit', 'cy.get'] },
      { name: 'jest', indicators: ['jest', 'expect(', 'jest.mock'] },
      { name: 'vitest', indicators: ['vitest', 'vi.mock', 'import { test'] },
      { name: 'mocha', indicators: ['mocha', 'chai', 'should'] }
    ];

    for (const framework of frameworks) {
      if (framework.indicators.some(indicator => content.includes(indicator))) {
        return framework.name;
      }
    }

    return 'generic';
  }

  /**
   * Extract imports from file content
   */
  extractImports(content) {
    const imports = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        type: 'es6',
        module: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }

    // CommonJS requires
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        type: 'commonjs',
        module: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }

    return imports;
  }

  /**
   * Extract describe blocks
   */
  extractDescribeBlocks(content) {
    const blocks = [];
    const regex = /describe(?:\.(?:only|skip))?\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        name: match[1],
        index: match.index,
        line: this.getLineNumber(content, match.index),
        modifier: match[0].includes('.only') ? 'only' : match[0].includes('.skip') ? 'skip' : null
      });
    }
    
    return blocks;
  }

  /**
   * Find nearest describe block for context
   */
  findNearestDescribe(testIndex, describeBlocks) {
    let nearestContext = null;
    let minDistance = Infinity;
    
    for (const block of describeBlocks) {
      if (block.index < testIndex) {
        const distance = testIndex - block.index;
        if (distance < minDistance) {
          minDistance = distance;
          nearestContext = block.name;
        }
      }
    }
    
    return nearestContext;
  }

  /**
   * Extract test modifiers (only, skip, etc.)
   */
  extractModifiers(testString) {
    const modifiers = [];
    if (testString.includes('.only')) modifiers.push('only');
    if (testString.includes('.skip')) modifiers.push('skip');
    if (testString.includes('.todo')) modifiers.push('todo');
    if (testString.includes('.concurrent')) modifiers.push('concurrent');
    if (testString.includes('.fixme')) modifiers.push('fixme');
    return modifiers;
  }

  /**
   * Check if test is async
   */
  isAsyncTest(content, testIndex) {
    const testContent = content.substring(testIndex, testIndex + 500);
    return /async\s*\([^)]*\)\s*=>/.test(testContent) || 
           /async\s+function/.test(testContent) ||
           /await\s+/.test(testContent);
  }

  /**
   * Get line number from content index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract Playwright-specific configuration
   */
  extractPlaywrightConfig(content) {
    const config = {};
    
    if (content.includes('test.use(')) {
      config.hasTestUse = true;
    }
    if (content.includes('test.describe.configure(')) {
      config.hasDescribeConfig = true;
    }
    
    return config;
  }

  /**
   * Extract Jest mocks
   */
  extractJestMocks(content) {
    const mocks = [];
    const mockRegex = /jest\.mock\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = mockRegex.exec(content)) !== null) {
      mocks.push({
        module: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return mocks;
  }

  /**
   * Extract Vitest mocks
   */
  extractVitestMocks(content) {
    const mocks = [];
    const mockRegex = /vi\.mock\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = mockRegex.exec(content)) !== null) {
      mocks.push({
        module: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return mocks;
  }

  /**
   * Extract Cypress commands
   */
  extractCypressCommands(content) {
    const commands = [];
    const commandRegex = /Cypress\.Commands\.add\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = commandRegex.exec(content)) !== null) {
      commands.push({
        name: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return commands;
  }

  /**
   * Extract Cypress commands used in a test
   */
  extractTestCypressCommands(content, testIndex) {
    const testContent = content.substring(testIndex, testIndex + 1000);
    const commands = [];
    const commandRegex = /cy\.(\w+)/g;
    let match;
    
    while ((match = commandRegex.exec(testContent)) !== null) {
      if (!commands.includes(match[1])) {
        commands.push(match[1]);
      }
    }
    
    return commands;
  }

  /**
   * Extract browser configurations for Playwright
   */
  extractBrowsers(content, testIndex) {
    const testContent = content.substring(Math.max(0, testIndex - 200), testIndex + 200);
    const browsers = [];
    
    if (testContent.includes('browserName')) {
      // Extract browser names from configuration
      const browserRegex = /browserName:\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = browserRegex.exec(testContent)) !== null) {
        browsers.push(match[1]);
      }
    }
    
    return browsers;
  }

  /**
   * Extract Playwright annotations
   */
  extractAnnotations(content, testIndex) {
    const beforeTest = content.substring(Math.max(0, testIndex - 300), testIndex);
    const annotations = [];
    
    const annotationRegex = /test\.(?:slow|fixme|fail|skip)\s*\(/g;
    let match;
    while ((match = annotationRegex.exec(beforeTest)) !== null) {
      const annotation = match[0].match(/test\.(\w+)/)[1];
      annotations.push(annotation);
    }
    
    return annotations;
  }

  /**
   * Extract test expectations/assertions
   */
  extractExpectations(content, testIndex) {
    const testContent = content.substring(testIndex, testIndex + 1000);
    const expectations = [];
    
    const expectRegex = /expect\([^)]+\)\.(\w+)/g;
    let match;
    while ((match = expectRegex.exec(testContent)) !== null) {
      if (!expectations.includes(match[1])) {
        expectations.push(match[1]);
      }
    }
    
    return expectations;
  }

  /**
   * Extract timeout configuration
   */
  extractTimeout(content, testIndex) {
    const testContent = content.substring(testIndex, testIndex + 500);
    const timeoutMatch = testContent.match(/\.timeout\s*\(\s*(\d+)\s*\)/);
    return timeoutMatch ? parseInt(timeoutMatch[1]) : null;
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks() {
    return [...this.supportedFrameworks];
  }

  /**
   * Validate parsed test data
   */
  validateParsedTest(test) {
    const required = ['framework', 'name', 'filePath', 'testId'];
    const missing = required.filter(field => !test[field]);
    
    return {
      valid: missing.length === 0,
      missing,
      test
    };
  }
}

module.exports = TestParserUtils;
