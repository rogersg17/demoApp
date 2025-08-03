# Test Data Directory

This directory contains all test-related data files organized by purpose and type.

## Directory Structure

### `/fixtures`
Contains static test data files used as input for tests:
- `test-login-data.json` - Login credentials and user data for authentication tests
- `create-test-user.js` - Script to create test users for validation
- `get-final-results.js` - Utility script to retrieve and format final test results

### `/results`  
Contains test execution results and output files:
- `test-results.json` - Primary test results from Playwright test runs
- `latest-test-results.json` - Most recent test execution results (used by server.js)
- `test-output.json` - Additional test output and metadata

### `/debug`
Contains debugging tools and test validation scripts:
- `debug-api.js` - API endpoint debugging and validation
- `debug-app-tests.js` - Application test debugging utilities
- `debug-json-parsing.js` - JSON parsing and validation debugging
- `debug-test-management.js` - Test management system validation
- `debug-test.js` - General test debugging utilities
- `debug-test.html` - HTML-based debugging interface
- `login-debug.html` - Login process debugging interface
- `test-ado-settings.html` - Azure DevOps settings testing interface

## Usage

### Running Debug Scripts
```bash
# API debugging
node tests/test-data/debug/debug-api.js

# Test management validation
node tests/test-data/debug/debug-test-management.js

# General debugging
node tests/test-data/debug/debug-test.js
```

### Accessing Test Fixtures
```javascript
// Load test login data
const testData = require('./tests/test-data/fixtures/test-login-data.json');

// Use test user creation script
const createUser = require('./tests/test-data/fixtures/create-test-user.js');
```

### Test Results
Test results are automatically saved to the `/results` directory by:
- Playwright configuration (configured in `playwright.config.ts`)
- Server.js for persistence across restarts
- Various test execution scripts

## File References Updated
The following files have been updated to reference the new organized structure:
- `playwright.config.ts` - Updated test results output path
- `server.js` - Updated latest-test-results.json path references
- `tests/validation/README.md` - Updated debug script paths

## Maintenance
When adding new test data files:
1. Place fixtures in `/fixtures`
2. Place results in `/results`  
3. Place debugging tools in `/debug`
4. Update this README with new file descriptions
5. Update any file references in configuration or scripts
