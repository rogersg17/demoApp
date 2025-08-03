# Test Suite Organization

This directory contains the complete test suite for the Test Management Platform MVP, organized by test type and purpose.

## 📁 Folder Structure

```
tests/
├── e2e/           # End-to-End UI Tests (Playwright)
├── api/           # API and Backend Tests
├── integration/   # Integration and System Tests
├── unit/          # Unit Tests for Individual Components
├── validation/    # System Validation and Health Checks
└── performance/   # Performance and Load Tests
```

## 🚀 Quick Start

### Run All Tests
```bash
npm test                    # Run all E2E tests
npm run test:api           # Run all API tests
npm run test:integration   # Run all integration tests
npm run test:unit          # Run all unit tests
npm run test:validation    # Run all validation tests
```

### Run Specific Test Categories
```bash
npm run test:e2e:login     # Login functionality tests
npm run test:api:auth      # Authentication API tests
npm run test:integration:websocket  # WebSocket integration tests
```

## 📊 Test Categories

### 🎭 End-to-End Tests (`e2e/`)
Browser-based functional tests using Playwright to verify complete user workflows.

### 🔌 API Tests (`api/`)
Backend API endpoint testing, authentication, and data validation.

### 🔗 Integration Tests (`integration/`)
Cross-component integration testing, WebSocket connections, and system interactions.

### ⚡ Unit Tests (`unit/`)
Individual component and function testing with isolated scope.

### ✅ Validation Tests (`validation/`)
System health checks, configuration validation, and infrastructure verification.

### 📈 Performance Tests (`performance/`)
Load testing, stress testing, and performance benchmarking.

## 🏃‍♂️ Running Tests

Each test category can be run independently:

1. **Development**: Run tests during development
2. **CI/CD**: Automated testing in deployment pipelines  
3. **Validation**: System health and configuration validation
4. **Performance**: Load and stress testing

## 📋 Test Configuration

- **Playwright Config**: `playwright.config.ts` and `playwright.config.jira.ts`
- **Test Data**: Stored in respective test folders
- **Page Objects**: Shared page objects in `/page-objects/`
- **Test Reports**: Generated in `/test-results/`

## 🔧 Adding New Tests

1. Choose the appropriate folder based on test type
2. Follow naming conventions: `*.spec.ts` for E2E, `*.test.js` for others
3. Update package.json scripts if adding new test categories
4. Document test purpose and expected outcomes

See individual folder README files for specific guidelines and examples.
