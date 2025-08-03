# End-to-End (E2E) Tests

This folder contains browser-based functional tests using Playwright to verify complete user workflows and UI interactions.

## 🎯 Purpose

E2E tests simulate real user interactions to ensure the application works correctly from the user's perspective. These tests cover complete workflows across multiple pages and components.

## 📁 Test Files

### Login & Authentication Tests
- `login-functional.spec.ts` - Core login functionality
- `login-validation.spec.ts` - Input validation and error handling
- `login-ui.spec.ts` - UI elements and styling
- `login-accessibility.spec.ts` - Accessibility compliance
- `login-navigation.spec.ts` - Navigation flow testing
- `login-messages.spec.ts` - Error and success messages
- `login-browser-behavior.spec.ts` - Cross-browser behavior

### Application Features
- `jira-demo.spec.ts` - JIRA integration demonstration
- `realtime-demo.spec.ts` - Real-time updates and WebSocket functionality
- `test-management-page.spec.ts` - Test management interface
- `settings-grid-layout.spec.ts` - Settings page layout and functionality
- `navigation-debug.spec.ts` - Navigation debugging and flow

## 🚀 Running E2E Tests

### All E2E Tests
```bash
npm test                           # Run all Playwright tests
npm run test:headed               # Run with browser UI visible
npm run test:ui                   # Run with Playwright UI mode
```

### Specific Test Categories
```bash
npm run test:login                # Run all login tests
npm run test:login:headed         # Run login tests with UI
npm run test:demo                 # Run demo functionality tests
npm run test:demo:headed          # Run demo tests with UI
```

### JIRA Integration Tests
```bash
npm run test:jira                 # Run JIRA-specific tests
npm run test:jira:headed          # Run JIRA tests with UI
npm run test:jira:ui              # Run JIRA tests in UI mode
```

### Static Testing (No Server)
```bash
npm run test:static               # Run without starting server
npm run test:jira:static          # Run JIRA tests without server
```

## 🔧 Test Configuration

### Playwright Configurations
- **Default**: `playwright.config.ts` - Standard test configuration
- **JIRA**: `playwright.config.jira.ts` - JIRA integration specific config

### Browser Support
- **Chromium** - Primary testing browser
- **Firefox** - Cross-browser compatibility
- **WebKit** - Safari compatibility testing

### Test Data
- Login credentials stored in test files
- Test users: `admin/admin123`, `jdoe/password123`
- Mock data for JIRA integration testing

## 📊 Test Reports

Test results are generated in multiple formats:
- **HTML Report**: `npm run test:report` - Visual test report
- **JSON Output**: `npm run test:json` - Machine-readable results
- **Compact JSON**: `npm run test:json:compact` - Summary statistics
- **Console Summary**: `npm run test:summary` - Terminal output

## 🎭 Page Objects

E2E tests use the Page Object pattern for maintainability:
- **LoginPage**: `/page-objects/LoginPage.js`
- **UserManagementPage**: `/page-objects/UserManagementPage.js`
- **BasePage**: `/page-objects/BasePage.js`

## ✅ Test Best Practices

### Writing E2E Tests
1. **Focus on user workflows** - Test complete business processes
2. **Use Page Objects** - Maintain reusable page interaction code
3. **Independent tests** - Each test should be able to run in isolation
4. **Clear assertions** - Verify expected outcomes explicitly
5. **Meaningful names** - Use descriptive test and describe names

### Test Structure
```typescript
test.describe('Feature Category', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for each test
  });

  test('TC001: Specific test scenario', async ({ page }) => {
    // Test implementation
    // Use page objects for interactions
    // Assert expected outcomes
  });
});
```

### Debugging Tests
- Use `--headed` flag to see browser interactions
- Add `await page.pause()` for debugging breakpoints
- Use `--ui` mode for interactive debugging
- Check browser console for JavaScript errors

## 🐛 Troubleshooting

### Common Issues
1. **Test timeouts** - Increase timeout or add explicit waits
2. **Element not found** - Check selectors and page load timing
3. **Authentication failures** - Verify test user credentials
4. **Server connection** - Ensure development server is running

### Debug Mode
```bash
# Run specific test with debugging
npx playwright test tests/e2e/login-functional.spec.ts --headed --debug

# Run with trace collection
npx playwright test --trace on
```

## 📈 Adding New E2E Tests

1. **Create test file**: Follow naming convention `feature-category.spec.ts`
2. **Use Page Objects**: Leverage existing page objects or create new ones
3. **Add to package.json**: Create specific npm script if needed
4. **Document test cases**: Add description of what the test verifies
5. **Update this README**: Document new test categories or special setup

Example new test structure:
```typescript
import { test, expect } from '@playwright/test';
const { LoginPage } = require('../../page-objects/LoginPage.js');

test.describe('New Feature Tests', () => {
  test('should verify new functionality', async ({ page }) => {
    // Test implementation
  });
});
```
