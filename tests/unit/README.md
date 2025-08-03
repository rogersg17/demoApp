# Unit Tests

This folder contains focused unit tests for individual functions, classes, and modules. Unit tests provide fast feedback and ensure code reliability at the component level.

## 🎯 Purpose

Unit tests verify that individual units of code (functions, classes, methods) work correctly in isolation. These tests should be fast, focused, and independent of external dependencies.

## 📁 Current Status

⚠️ **Note**: This folder is currently empty but prepared for unit test implementation. As the project evolves and more modular code is developed, unit tests should be added here.

## 🚀 Running Unit Tests

### When Unit Tests Are Added
```bash
npm run test:unit                    # Run all unit tests
npm run test:unit:watch             # Run unit tests in watch mode
npm run test:unit:coverage          # Run unit tests with coverage report
```

### Individual Test Categories (Future)
```bash
npm run test:unit:services          # Test service layer
npm run test:unit:utils             # Test utility functions
npm run test:unit:models            # Test data models
npm run test:unit:components        # Test UI components
```

## 🧪 Unit Test Framework

### Recommended Testing Stack
- **Test Runner**: Jest (recommended) or Mocha
- **Assertion Library**: Jest assertions or Chai
- **Mocking**: Jest mocks or Sinon
- **Coverage**: Built-in Jest coverage or NYC

### Setup Example (Jest)
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'lib/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 📋 Unit Test Categories

### 1. Service Layer Tests (`services/`)
Test business logic and data processing:
```javascript
// Example: tests/unit/services/flakyTestDetectionService.test.js
const { detectFlakyTests } = require('../../../services/flakyTestDetectionService');

describe('FlakyTestDetectionService', () => {
  describe('detectFlakyTests', () => {
    it('should identify flaky tests with inconsistent results', () => {
      const testResults = [
        { name: 'test1', status: 'passed', duration: 100 },
        { name: 'test1', status: 'failed', duration: 150 },
        { name: 'test1', status: 'passed', duration: 120 }
      ];
      
      const result = detectFlakyTests(testResults);
      
      expect(result.flakyTests).toHaveLength(1);
      expect(result.flakyTests[0].name).toBe('test1');
      expect(result.flakyTests[0].flakyScore).toBeGreaterThan(0.5);
    });
    
    it('should return empty array for consistent tests', () => {
      const testResults = [
        { name: 'test1', status: 'passed', duration: 100 },
        { name: 'test1', status: 'passed', duration: 105 },
        { name: 'test1', status: 'passed', duration: 98 }
      ];
      
      const result = detectFlakyTests(testResults);
      
      expect(result.flakyTests).toHaveLength(0);
    });
  });
});
```

### 2. Utility Function Tests (`utils/`)
Test helper functions and utilities:
```javascript
// Example: tests/unit/utils/dateUtils.test.js
const { formatDate, parseDate, isValidDate } = require('../../../utils/dateUtils');

describe('DateUtils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, 'YYYY-MM-DD');
      
      expect(formatted).toBe('2024-01-15');
    });
    
    it('should handle invalid dates', () => {
      const result = formatDate(null, 'YYYY-MM-DD');
      
      expect(result).toBe('');
    });
  });
  
  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
    });
    
    it('should return false for invalid dates', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });
});
```

### 3. Database Layer Tests (`database/`)
Test database operations and models:
```javascript
// Example: tests/unit/database/testResultModel.test.js
const TestResultModel = require('../../../database/models/TestResult');

describe('TestResultModel', () => {
  let mockDb;
  
  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      run: jest.fn()
    };
  });
  
  describe('save', () => {
    it('should save test result to database', async () => {
      const testResult = new TestResultModel({
        testName: 'example test',
        status: 'passed',
        duration: 100
      });
      
      mockDb.run.mockResolvedValue({ lastID: 1 });
      
      const result = await testResult.save(mockDb);
      
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_results'),
        expect.arrayContaining(['example test', 'passed', 100])
      );
      expect(result.id).toBe(1);
    });
  });
  
  describe('findByName', () => {
    it('should retrieve test results by name', async () => {
      const mockResults = [
        { id: 1, testName: 'example test', status: 'passed' }
      ];
      
      mockDb.query.mockResolvedValue(mockResults);
      
      const results = await TestResultModel.findByName('example test', mockDb);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM test_results WHERE testName = ?'),
        ['example test']
      );
      expect(results).toEqual(mockResults);
    });
  });
});
```

### 4. API Route Tests (`routes/`)
Test route handlers in isolation:
```javascript
// Example: tests/unit/routes/flakyTestRoutes.test.js
const request = require('supertest');
const express = require('express');
const flakyTestRoutes = require('../../../routes/flakyTestRoutes');

// Mock dependencies
jest.mock('../../../services/flakyTestDetectionService');

describe('FlakyTestRoutes', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/flaky-tests', flakyTestRoutes);
  });
  
  describe('GET /api/flaky-tests', () => {
    it('should return flaky tests', async () => {
      const mockFlakyTests = [
        { name: 'test1', flakyScore: 0.8 }
      ];
      
      require('../../../services/flakyTestDetectionService')
        .getFlakyTests.mockResolvedValue(mockFlakyTests);
      
      const response = await request(app)
        .get('/api/flaky-tests')
        .expect(200);
      
      expect(response.body).toEqual(mockFlakyTests);
    });
    
    it('should handle errors gracefully', async () => {
      require('../../../services/flakyTestDetectionService')
        .getFlakyTests.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/flaky-tests')
        .expect(500);
      
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
```

## ✅ Writing Good Unit Tests

### Test Structure (AAA Pattern)
```javascript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Arrange - Set up test data and mocks
      const input = { value: 'test' };
      const expected = { processed: 'test' };
      
      // Act - Execute the code under test
      const result = methodName(input);
      
      // Assert - Verify the result
      expect(result).toEqual(expected);
    });
  });
});
```

### Test Naming Conventions
- **Describe blocks**: Use the component/function name
- **Test descriptions**: Use "should [expected behavior] when [condition]"
- **Be specific**: Clearly state what is being tested

### Mocking External Dependencies
```javascript
// Mock external modules
jest.mock('../../../services/externalService');

// Mock specific functions
const mockFunction = jest.fn();
mockFunction.mockReturnValue('mocked result');

// Mock with different return values
mockFunction
  .mockReturnValueOnce('first call')
  .mockReturnValueOnce('second call')
  .mockReturnValue('default');

// Mock async functions
mockFunction.mockResolvedValue('async result');
mockFunction.mockRejectedValue(new Error('async error'));
```

### Testing Async Code
```javascript
// Testing promises
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Testing with timeouts
it('should timeout after specified time', async () => {
  const promise = longRunningFunction();
  
  await expect(promise).rejects.toThrow('Timeout');
}, 10000); // 10 second timeout
```

### Testing Error Conditions
```javascript
it('should throw error for invalid input', () => {
  expect(() => {
    functionThatThrows(invalidInput);
  }).toThrow('Expected error message');
});

it('should handle async errors', async () => {
  await expect(asyncFunctionThatFails()).rejects.toThrow('Async error');
});
```

## 🔧 Test Setup and Teardown

### Common Setup Patterns
```javascript
describe('ComponentName', () => {
  let component;
  let mockDependency;
  
  beforeEach(() => {
    // Setup before each test
    mockDependency = {
      method: jest.fn()
    };
    component = new ComponentName(mockDependency);
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
  
  beforeAll(() => {
    // One-time setup for all tests
  });
  
  afterAll(() => {
    // One-time cleanup for all tests
  });
});
```

## 📊 Test Coverage

### Coverage Goals
- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Viewing Coverage
```bash
npm run test:unit:coverage
```

### Coverage Reports
```javascript
// Generate detailed HTML coverage report
"test:coverage:html": "jest --coverage --coverageReporters=html"

// Check coverage against thresholds
"test:coverage:check": "jest --coverage --coverageThreshold"
```

## 🚀 Test Performance

### Fast Test Guidelines
1. **Avoid I/O operations** - Mock file system and network calls
2. **Use pure functions** - Test functions without side effects
3. **Minimal setup** - Only create what's needed for the test
4. **Parallel execution** - Let Jest run tests in parallel

### Performance Monitoring
```javascript
// Time critical operations
console.time('test execution');
await criticalFunction();
console.timeEnd('test execution');

// Set appropriate timeouts
jest.setTimeout(5000); // 5 seconds max per test
```

## 🐛 Debugging Unit Tests

### Common Issues
1. **Async operations not awaited**
2. **Mocks not reset between tests**
3. **External dependencies not properly mocked**
4. **Test isolation problems**

### Debugging Techniques
```javascript
// Add debugging output
console.log('Test data:', testData);
console.log('Mock calls:', mockFunction.mock.calls);

// Use Jest debugging
// Add --detectOpenHandles to find async operations
// Add --verbose for detailed test output

// Debug specific tests
npm test -- --testNamePattern="specific test name"
```

## 📋 Adding Unit Tests

### For New Functions
1. **Create test file** alongside source file
2. **Test happy path** first
3. **Add edge cases** and error conditions
4. **Mock dependencies** appropriately
5. **Verify coverage** meets requirements

### For Existing Code
1. **Start with critical functions**
2. **Add tests incrementally**
3. **Refactor for testability** if needed
4. **Maintain existing behavior**

### Test File Organization
```
tests/unit/
├── services/
│   ├── flakyTestDetectionService.test.js
│   ├── testDiscoveryService.test.js
│   └── adoBuildConsumer.test.js
├── utils/
│   ├── dateUtils.test.js
│   ├── testUtils.test.js
│   └── validationUtils.test.js
├── database/
│   ├── models/
│   │   ├── TestResult.test.js
│   │   └── User.test.js
│   └── migrations.test.js
└── routes/
    ├── flakyTestRoutes.test.js
    ├── adoDashboard.test.js
    └── gitWebhooks.test.js
```

## 🎯 Testing Best Practices

### 1. Test Isolation
- Each test should be independent
- Use fresh mocks for each test
- Clean up after tests

### 2. Test Clarity
- Use descriptive test names
- Keep tests focused and simple
- Use meaningful assertions

### 3. Test Completeness
- Test both success and failure paths
- Test edge cases and boundary conditions
- Test error handling

### 4. Test Maintainability
- Keep tests close to source code
- Update tests when code changes
- Remove obsolete tests

### Example Complete Unit Test
```javascript
const FlakyTestDetector = require('../../../services/flakyTestDetectionService');

describe('FlakyTestDetector', () => {
  let detector;
  let mockDatabase;
  
  beforeEach(() => {
    mockDatabase = {
      getTestResults: jest.fn(),
      saveAnalysis: jest.fn()
    };
    detector = new FlakyTestDetector(mockDatabase);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('analyzeTestStability', () => {
    it('should detect flaky test with varying results', async () => {
      // Arrange
      const testResults = [
        { name: 'test1', status: 'passed', duration: 100, timestamp: '2024-01-01' },
        { name: 'test1', status: 'failed', duration: 150, timestamp: '2024-01-02' },
        { name: 'test1', status: 'passed', duration: 120, timestamp: '2024-01-03' }
      ];
      
      mockDatabase.getTestResults.mockResolvedValue(testResults);
      
      // Act
      const analysis = await detector.analyzeTestStability('test1');
      
      // Assert
      expect(analysis.isFlaky).toBe(true);
      expect(analysis.stabilityScore).toBeLessThan(0.8);
      expect(analysis.failureRate).toBeCloseTo(0.33, 2);
      expect(mockDatabase.saveAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          testName: 'test1',
          isFlaky: true
        })
      );
    });
    
    it('should not detect stable test as flaky', async () => {
      // Arrange
      const testResults = [
        { name: 'test1', status: 'passed', duration: 100, timestamp: '2024-01-01' },
        { name: 'test1', status: 'passed', duration: 105, timestamp: '2024-01-02' },
        { name: 'test1', status: 'passed', duration: 98, timestamp: '2024-01-03' }
      ];
      
      mockDatabase.getTestResults.mockResolvedValue(testResults);
      
      // Act
      const analysis = await detector.analyzeTestStability('test1');
      
      // Assert
      expect(analysis.isFlaky).toBe(false);
      expect(analysis.stabilityScore).toBeGreaterThan(0.9);
      expect(analysis.failureRate).toBe(0);
    });
    
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabase.getTestResults.mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(detector.analyzeTestStability('test1'))
        .rejects.toThrow('Failed to analyze test stability');
      
      expect(mockDatabase.saveAnalysis).not.toHaveBeenCalled();
    });
  });
});
```
