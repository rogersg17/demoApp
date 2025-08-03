# API Tests

This folder contains backend API endpoint testing, authentication validation, and data verification tests.

## 🎯 Purpose

API tests verify backend functionality, endpoint responses, authentication mechanisms, and data integrity without requiring browser interaction.

## 📁 Test Files

### Authentication & Security
- `test-login.js` - Login endpoint testing
- `test-auth-flow.js` - Authentication flow validation
- `test-security.js` - Security measures and validation
- `test-session.js` - Session management testing
- `test-invalid-login.js` - Invalid login attempt handling

### API Endpoint Testing
- `test-api.js` - Core API endpoint testing
- `test-api-tests.js` - Test execution API endpoints
- `test-api-quick.js` - Quick API validation tests
- `test-duration-fix.js` - Performance and timing tests

## 🚀 Running API Tests

### All API Tests
```bash
npm run test:api              # Run all API tests
npm run test:api:auth         # Run authentication tests
npm run test:api:endpoints    # Run endpoint validation tests
```

### Individual Test Files
```bash
node tests/api/test-api.js           # Core API testing
node tests/api/test-login.js         # Login API testing
node tests/api/test-security.js      # Security validation
node tests/api/test-auth-flow.js     # Authentication flow
```

### Quick Validation
```bash
node tests/api/test-api-quick.js     # Quick API health check
```

## 🔧 Test Environment

### Prerequisites
- **Server Running**: API tests require the backend server to be running
- **Database**: SQLite database should be initialized
- **Test Data**: Test users and data should be available

### Server Setup
```bash
# Start the server before running API tests
npm start                    # or npm run dev
```

### Default Test URLs
- **Local Development**: `http://localhost:5173`
- **API Base**: `/api/`
- **Authentication**: `/api/login`

## 📊 Test Structure

### HTTP Methods Testing
- **GET** - Data retrieval and endpoint availability
- **POST** - Data creation and form submissions
- **PUT** - Data updates and modifications
- **DELETE** - Data removal and cleanup

### Response Validation
- **Status Codes** - HTTP response codes (200, 401, 404, etc.)
- **Response Format** - JSON structure and data types
- **Error Handling** - Error messages and error codes
- **Data Integrity** - Correct data values and relationships

## 🔐 Authentication Testing

### Login Scenarios
```javascript
// Successful authentication
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

// Invalid credentials
const invalidLogin = await fetch('/api/login', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'invalid', password: 'wrong' })
});
```

### Session Management
- Session creation and validation
- Session timeout testing
- Multi-session handling
- Session cleanup and logout

## 📈 Performance Testing

### Response Time Validation
- API endpoint response times
- Database query performance
- Authentication speed
- Large data set handling

### Load Testing Basics
```javascript
// Basic performance measurement
const start = Date.now();
const response = await fetch('/api/endpoint');
const duration = Date.now() - start;
console.log(`Request took ${duration}ms`);
```

## 🧪 Test Data Management

### Test Users
- **Admin User**: `admin / admin123`
- **Regular User**: `jdoe / password123`
- **Test User**: For specific test scenarios

### Test Data Cleanup
- Restore database state after tests
- Clean up created test records
- Reset authentication state

## ✅ Writing API Tests

### Basic Test Structure
```javascript
const fetch = require('node-fetch');

async function testEndpoint() {
  try {
    console.log('Testing API endpoint...');
    
    // Setup
    const authData = await authenticate();
    
    // Test
    const response = await fetch('/api/test-endpoint', {
      headers: { 'Authorization': `Bearer ${authData.token}` }
    });
    
    // Validation
    const data = await response.json();
    assert(response.status === 200, 'Expected 200 status');
    assert(data.success === true, 'Expected success response');
    
    console.log('✅ Test passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}
```

### Error Handling
```javascript
// Test error scenarios
const response = await fetch('/api/protected-endpoint');
assert(response.status === 401, 'Should require authentication');

const errorData = await response.json();
assert(errorData.error, 'Should include error message');
```

## 🔍 Debugging API Tests

### Logging Requests
```javascript
console.log('Request:', {
  url: '/api/endpoint',
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
});
```

### Response Inspection
```javascript
console.log('Response:', {
  status: response.status,
  headers: response.headers,
  body: await response.text()
});
```

## 🐛 Troubleshooting

### Common Issues
1. **Server not running** - Start the development server
2. **CORS errors** - Check cross-origin settings
3. **Authentication failures** - Verify test credentials
4. **Database issues** - Check database connectivity and data

### Error Debugging
```bash
# Check server logs
tail -f server.log

# Verify endpoint availability
curl -X GET http://localhost:5173/api/health

# Test authentication manually
curl -X POST http://localhost:5173/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📋 Adding New API Tests

1. **Create test file**: Follow naming convention `test-feature.js`
2. **Include authentication**: Most APIs require authentication
3. **Test all scenarios**: Success, failure, and edge cases
4. **Validate responses**: Check status, data, and error handling
5. **Add to package.json**: Create npm script for easy execution
6. **Document test cases**: Explain what each test verifies

### Example Test Template
```javascript
const fetch = require('node-fetch');

async function testNewFeature() {
  console.log('🧪 Testing New Feature API...\n');
  
  try {
    // Setup - authenticate if needed
    const auth = await authenticate();
    
    // Test 1: Success scenario
    console.log('1. Testing success scenario...');
    const response = await fetch('/api/new-feature', {
      headers: { 'Authorization': auth.token }
    });
    
    const data = await response.json();
    assert(response.status === 200);
    assert(data.success === true);
    console.log('✅ Success scenario passed');
    
    // Test 2: Error scenario
    console.log('2. Testing error scenario...');
    // Add error test logic
    
    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Helper functions
async function authenticate() {
  // Authentication logic
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Run tests
testNewFeature();
```
