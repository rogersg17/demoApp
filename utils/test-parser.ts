import TestIdentifierService from '../services/test-identifier';

type Framework = 'playwright' | 'jest' | 'mocha' | 'cypress' | 'vitest' | 'jasmine' | 'generic';

interface Import {
    type: 'es6' | 'commonjs';
    module: string;
    line: number;
}

interface DescribeBlock {
    name: string;
    index: number;
    line: number;
    modifier: 'only' | 'skip' | null;
}

interface Mock {
    module: string;
    line: number;
}

interface Command {
    name: string;
    line: number;
}

interface BaseTest {
    framework: Framework;
    name: string;
    filePath: string;
    lineNumber: number;
    isAsync: boolean;
    testId: string;
    context?: string | null;
    modifiers?: string[];
}

interface PlaywrightTest extends BaseTest {
    framework: 'playwright';
    browsers: string[];
    annotations: string[];
}

interface JestTest extends BaseTest {
    framework: 'jest';
    expectations: string[];
}

interface MochaTest extends BaseTest {
    framework: 'mocha';
    timeout: number | null;
}

interface CypressTest extends BaseTest {
    framework: 'cypress';
    cypressCommands: string[];
}

interface VitestTest extends BaseTest {
    framework: 'vitest';
    isConcurrent: boolean;
}

type ParsedTest = PlaywrightTest | JestTest | MochaTest | CypressTest | VitestTest | BaseTest;

interface BaseParseResult {
    framework: Framework;
    filePath: string;
    tests: ParsedTest[];
    imports: Import[];
    metadata: Record<string, any>;
}

interface PlaywrightParseResult extends BaseParseResult {
    framework: 'playwright';
    config: {
        hasTestUse?: boolean;
        hasDescribeConfig?: boolean;
    };
    metadata: {
        hasParallelTests: boolean;
        hasSerialTests: boolean;
        hasCustomFixtures: boolean;
        hasPageObjectPattern: boolean;
    };
}

interface JestParseResult extends BaseParseResult {
    framework: 'jest';
    mocks: Mock[];
    metadata: {
        hasSetup: boolean;
        hasTeardown: boolean;
        usesSnapshots: boolean;
        usesMocks: boolean;
    };
}

interface MochaParseResult extends BaseParseResult {
    framework: 'mocha';
    metadata: {
        hasHooks: boolean;
        usesChai: boolean;
        hasSuites: boolean;
    };
}

interface CypressParseResult extends BaseParseResult {
    framework: 'cypress';
    commands: Command[];
    metadata: {
        hasCustomCommands: boolean;
        hasFixtures: boolean;
        hasIntercepts: boolean;
        hasViewportCommands: boolean;
    };
}

interface VitestParseResult extends BaseParseResult {
    framework: 'vitest';
    mocks: Mock[];
    metadata: {
        hasConcurrentTests: boolean;
        usesVI: boolean;
        usesMocks: boolean;
    };
}

type ParseResult = PlaywrightParseResult | JestParseResult | MochaParseResult | CypressParseResult | VitestParseResult | BaseParseResult;


/**
 * Test Parser Utilities
 * Utilities for parsing different test file formats and extracting metadata
 * Part of ADR-001 implementation for test code and metadata separation
 */
class TestParserUtils {
  private testIdentifier: TestIdentifierService;
  private supportedFrameworks: Framework[];

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
  parseTestFile(content: string, filePath: string, framework: Framework | null = null): ParseResult {
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
  parsePlaywrightFile(content: string, filePath: string): PlaywrightParseResult {
    const tests: PlaywrightTest[] = [];
    const imports = this.extractImports(content);
    const config = this.extractPlaywrightConfig(content);
    
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
        
        const test: PlaywrightTest = {
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
  parseJestFile(content: string, filePath: string): JestParseResult {
    const tests: JestTest[] = [];
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
        
        const test: JestTest = {
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
  parseMochaFile(content: string, filePath: string): MochaParseResult {
    const tests: MochaTest[] = [];
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
        
        const test: MochaTest = {
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
  parseCypressFile(content: string, filePath: string): CypressParseResult {
    const tests: CypressTest[] = [];
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
        
        const test: CypressTest = {
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
  parseVitestFile(content: string, filePath: string): VitestParseResult {
    const tests: VitestTest[] = [];
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
        
        const test: VitestTest = {
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
  parseGenericFile(content: string, filePath: string): BaseParseResult {
    const tests: BaseTest[] = [];
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
        
        const test: BaseTest = {
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
  detectFramework(content: string): Framework {
    const frameworks: { name: Framework, indicators: string[] }[] = [
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
  extractImports(content: string): Import[] {
    const imports: Import[] = [];
    
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
  extractDescribeBlocks(content: string): DescribeBlock[] {
    const blocks: DescribeBlock[] = [];
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
  findNearestDescribe(testIndex: number, describeBlocks: DescribeBlock[]): string | null {
    let nearestContext: string | null = null;
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
  extractModifiers(testString: string): string[] {
    const modifiers: string[] = [];
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
  isAsyncTest(content: string, testIndex: number): boolean {
    const testContent = content.substring(testIndex, testIndex + 500);
    return /async\s*\([^)]*\)\s*=>/.test(testContent) || 
           /async\s+function/.test(testContent) ||
           /await\s+/.test(testContent);
  }

  /**
   * Get line number from content index
   */
  getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract Playwright-specific configuration
   */
  extractPlaywrightConfig(content: string): { hasTestUse?: boolean; hasDescribeConfig?: boolean } {
    const config: { hasTestUse?: boolean; hasDescribeConfig?: boolean } = {};
    
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
  extractJestMocks(content: string): Mock[] {
    const mocks: Mock[] = [];
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
  extractVitestMocks(content: string): Mock[] {
    const mocks: Mock[] = [];
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
  extractCypressCommands(content: string): Command[] {
    const commands: Command[] = [];
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
  extractTestCypressCommands(content: string, testIndex: number): string[] {
    const testContent = content.substring(testIndex, testIndex + 1000);
    const commands: string[] = [];
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
  extractBrowsers(content: string, testIndex: number): string[] {
    const testContent = content.substring(Math.max(0, testIndex - 200), testIndex + 200);
    const browsers: string[] = [];
    
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
  extractAnnotations(content: string, testIndex: number): string[] {
    const beforeTest = content.substring(Math.max(0, testIndex - 300), testIndex);
    const annotations: string[] = [];
    
    const annotationRegex = /test\.(?:slow|fixme|fail|skip)\s*\(/g;
    let match;
    while ((match = annotationRegex.exec(beforeTest)) !== null) {
        const annotationMatch = match[0].match(/test\.(\w+)/);
        if (annotationMatch) {
            annotations.push(annotationMatch[1]);
        }
    }
    
    return annotations;
  }

  /**
   * Extract test expectations/assertions
   */
  extractExpectations(content: string, testIndex: number): string[] {
    const testContent = content.substring(testIndex, testIndex + 1000);
    const expectations: string[] = [];
    
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
  extractTimeout(content: string, testIndex: number): number | null {
    const testContent = content.substring(testIndex, testIndex + 500);
    const timeoutMatch = testContent.match(/\.timeout\s*\(\s*(\d+)\s*\)/);
    return timeoutMatch ? parseInt(timeoutMatch[1], 10) : null;
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks(): Framework[] {
    return [...this.supportedFrameworks];
  }

  /**
   * Validate parsed test data
   */
  validateParsedTest(test: ParsedTest): { valid: boolean; missing: string[]; test: ParsedTest } {
    const required = ['framework', 'name', 'filePath', 'testId'];
    const missing = required.filter(field => !(field in test));
    
    return {
      valid: missing.length === 0,
      missing,
      test
    };
  }
}

export default TestParserUtils;
