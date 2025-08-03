# Validation Tests

This folder contains comprehensive validation testing for data integrity, business rules, system constraints, and application behavior verification.

## 🎯 Purpose

Validation tests ensure that the application correctly enforces business rules, validates input data, maintains data integrity, and behaves according to specifications across different scenarios.

## 📁 Test Files

### Core Validation
- `validate-phase1.js` - Phase 1 system validation and verification
- `test-duration-fix.js` - Test execution duration validation
- `test-invalid-login.js` - Invalid login attempt validation

### Security Validation
- `test-security.js` - Security constraints and vulnerability testing
- `test-auth-flow.js` - Authentication flow validation

### System Validation  
- `test-session.js` - Session management and validation
- `../test-data/debug/debug-test-management.js` - Test management system validation

## 🚀 Running Validation Tests

### All Validation Tests
```bash
npm run test:validation                    # Run all validation tests
npm run test:validation:security          # Security-focused validation
npm run test:validation:data              # Data integrity validation
npm run test:validation:business          # Business rule validation
```

### Individual Validation Categories
```bash
# Core System Validation
node tests/validation/validate-phase1.js
node tests/validation/test-duration-fix.js

# Security Validation
node tests/validation/test-security.js
node tests/validation/test-auth-flow.js
node tests/validation/test-invalid-login.js

# Session and Management
node tests/validation/test-session.js
node tests/test-data/debug/debug-test-management.js
```

## 🔍 Validation Test Types

### 1. Data Validation
Tests that ensure data integrity and proper validation:

```javascript
// Example: Data format validation
async function validateDataFormats() {
  console.log('📝 Validating data formats...');
  
  const testCases = [
    { email: 'user@example.com', valid: true },
    { email: 'invalid-email', valid: false },
    { email: '', valid: false },
    { email: null, valid: false }
  ];
  
  for (const testCase of testCases) {
    const result = validateEmail(testCase.email);
    assert(result === testCase.valid, 
      `Email validation failed for: ${testCase.email}`);
  }
  
  console.log('✅ Data format validation passed');
}
```

### 2. Business Rule Validation
Tests that verify business logic and constraints:

```javascript
// Example: Test execution rules
async function validateTestExecutionRules() {
  console.log('⚖️ Validating business rules...');
  
  // Rule: Test duration should be within acceptable limits
  const testResult = {
    name: 'sample-test',
    duration: 30000, // 30 seconds
    status: 'passed'
  };
  
  // Validate duration constraints
  assert(testResult.duration < 60000, 'Test duration exceeds maximum allowed');
  assert(testResult.duration > 0, 'Test duration must be positive');
  
  // Rule: Failed tests must have error information
  if (testResult.status === 'failed') {
    assert(testResult.error, 'Failed tests must include error information');
  }
  
  console.log('✅ Business rule validation passed');
}
```

### 3. Security Validation
Tests that ensure security constraints are enforced:

```javascript
// Example: Authentication validation
async function validateSecurityConstraints() {
  console.log('🔒 Validating security constraints...');
  
  // Test 1: Unauthorized access blocked
  try {
    const response = await fetch('http://localhost:5173/api/protected', {
      method: 'GET'
      // No authorization header
    });
    
    assert(response.status === 401, 'Unauthorized access should be blocked');
    console.log('✅ Unauthorized access properly blocked');
  } catch (error) {
    console.error('❌ Security validation failed:', error.message);
    throw error;
  }
  
  // Test 2: Invalid credentials rejected
  try {
    const response = await fetch('http://localhost:5173/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'invalid',
        password: 'wrong'
      })
    });
    
    assert(response.status === 401, 'Invalid credentials should be rejected');
    console.log('✅ Invalid credentials properly rejected');
  } catch (error) {
    console.error('❌ Credential validation failed:', error.message);
    throw error;
  }
}
```

### 4. Input Validation
Tests that verify proper input sanitization and validation:

```javascript
// Example: Input sanitization validation
async function validateInputSanitization() {
  console.log('🧹 Validating input sanitization...');
  
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    "'; DROP TABLE users; --",
    '../../../etc/passwd',
    '{{7*7}}', // Template injection
    'javascript:alert(1)'
  ];
  
  for (const input of maliciousInputs) {
    try {
      const response = await fetch('http://localhost:5173/api/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify({ query: input })
      });
      
      const result = await response.json();
      
      // Ensure malicious input is sanitized
      assert(!result.data || !result.data.includes(input), 
        `Malicious input not properly sanitized: ${input}`);
        
    } catch (error) {
      console.error(`Input validation failed for: ${input}`, error.message);
      throw error;
    }
  }
  
  console.log('✅ Input sanitization validation passed');
}
```

## 📊 Phase 1 Validation

### System Readiness Validation
```javascript
async function validatePhase1Readiness() {
  console.log('🎯 Validating Phase 1 system readiness...\n');
  
  const validationResults = {
    authentication: false,
    apiEndpoints: false,
    database: false,
    webInterface: false,
    realTimeFeatures: false
  };
  
  try {
    // 1. Authentication System
    console.log('1. Validating Authentication System...');
    await validateAuthenticationSystem();
    validationResults.authentication = true;
    console.log('✅ Authentication validation passed\n');
    
    // 2. API Endpoints
    console.log('2. Validating API Endpoints...');
    await validateAPIEndpoints();
    validationResults.apiEndpoints = true;
    console.log('✅ API endpoints validation passed\n');
    
    // 3. Database Operations
    console.log('3. Validating Database Operations...');
    await validateDatabaseOperations();
    validationResults.database = true;
    console.log('✅ Database validation passed\n');
    
    // 4. Web Interface
    console.log('4. Validating Web Interface...');
    await validateWebInterface();
    validationResults.webInterface = true;
    console.log('✅ Web interface validation passed\n');
    
    // 5. Real-time Features
    console.log('5. Validating Real-time Features...');
    await validateRealTimeFeatures();
    validationResults.realTimeFeatures = true;
    console.log('✅ Real-time features validation passed\n');
    
    // Calculate overall success rate
    const totalTests = Object.keys(validationResults).length;
    const passedTests = Object.values(validationResults).filter(Boolean).length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log(`🎉 Phase 1 Validation Complete: ${successRate}% success rate`);
    console.log(`   Passed: ${passedTests}/${totalTests} validation categories`);
    
    return {
      success: passedTests === totalTests,
      successRate,
      results: validationResults
    };
    
  } catch (error) {
    console.error('❌ Phase 1 validation failed:', error.message);
    return {
      success: false,
      error: error.message,
      results: validationResults
    };
  }
}
```

## 🔐 Security Validation Framework

### Authentication Flow Validation
```javascript
async function validateAuthenticationFlow() {
  console.log('🔐 Validating Authentication Flow...\n');
  
  const tests = [
    {
      name: 'Valid Login',
      credentials: { username: 'admin', password: 'admin123' },
      expectedStatus: 200,
      expectToken: true
    },
    {
      name: 'Invalid Username',
      credentials: { username: 'nonexistent', password: 'admin123' },
      expectedStatus: 401,
      expectToken: false
    },
    {
      name: 'Invalid Password',
      credentials: { username: 'admin', password: 'wrongpassword' },
      expectedStatus: 401,
      expectToken: false
    },
    {
      name: 'Missing Credentials',
      credentials: {},
      expectedStatus: 400,
      expectToken: false
    },
    {
      name: 'SQL Injection Attempt',
      credentials: { username: "admin'; DROP TABLE users; --", password: 'admin123' },
      expectedStatus: 401,
      expectToken: false
    }
  ];
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      const response = await fetch('http://localhost:5173/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.credentials)
      });
      
      // Validate response status
      assert(response.status === test.expectedStatus, 
        `Expected status ${test.expectedStatus}, got ${response.status}`);
      
      const data = await response.json();
      
      // Validate token presence
      if (test.expectToken) {
        assert(data.token, 'Expected authentication token in response');
        console.log('✅ Token received for valid credentials');
      } else {
        assert(!data.token, 'Token should not be present for invalid credentials');
        console.log('✅ No token for invalid credentials');
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
      throw error;
    }
  }
  
  console.log('\n🎉 Authentication flow validation completed successfully');
}
```

### Authorization Validation
```javascript
async function validateAuthorization() {
  console.log('🛡️ Validating Authorization...\n');
  
  // Get valid token first
  const loginResponse = await fetch('http://localhost:5173/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const { token } = await loginResponse.json();
  
  const protectedEndpoints = [
    '/api/test-results',
    '/api/flaky-tests',
    '/api/dashboard/stats',
    '/api/admin/users'
  ];
  
  for (const endpoint of protectedEndpoints) {
    console.log(`Testing authorization for: ${endpoint}`);
    
    // Test 1: Valid token
    const validResponse = await fetch(`http://localhost:5173${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    assert(validResponse.status !== 401, 
      `Valid token should be accepted for ${endpoint}`);
    console.log('✅ Valid token accepted');
    
    // Test 2: Missing token
    const noTokenResponse = await fetch(`http://localhost:5173${endpoint}`);
    
    assert(noTokenResponse.status === 401, 
      `Missing token should be rejected for ${endpoint}`);
    console.log('✅ Missing token rejected');
    
    // Test 3: Invalid token
    const invalidTokenResponse = await fetch(`http://localhost:5173${endpoint}`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    
    assert(invalidTokenResponse.status === 401, 
      `Invalid token should be rejected for ${endpoint}`);
    console.log('✅ Invalid token rejected');
  }
  
  console.log('\n🎉 Authorization validation completed successfully');
}
```

## ⏱️ Performance Validation

### Duration and Timeout Validation
```javascript
async function validatePerformanceConstraints() {
  console.log('⏱️ Validating Performance Constraints...\n');
  
  const performanceTests = [
    {
      name: 'API Response Time',
      endpoint: '/api/dashboard/stats',
      maxDuration: 2000, // 2 seconds
      method: 'GET'
    },
    {
      name: 'Login Response Time',
      endpoint: '/auth/login',
      maxDuration: 1000, // 1 second
      method: 'POST',
      body: { username: 'admin', password: 'admin123' }
    },
    {
      name: 'Database Query Performance',
      endpoint: '/api/test-results',
      maxDuration: 3000, // 3 seconds
      method: 'GET'
    }
  ];
  
  for (const test of performanceTests) {
    console.log(`Testing: ${test.name}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`http://localhost:5173${test.endpoint}`, {
        method: test.method,
        headers: test.body ? { 'Content-Type': 'application/json' } : {},
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      const duration = Date.now() - startTime;
      
      assert(duration < test.maxDuration, 
        `${test.name} took ${duration}ms, exceeds maximum ${test.maxDuration}ms`);
      
      console.log(`✅ ${test.name} completed in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${test.name} failed after ${duration}ms:`, error.message);
      throw error;
    }
  }
  
  console.log('\n🎉 Performance validation completed successfully');
}
```

## 🔄 Session Validation

### Session Management Testing
```javascript
async function validateSessionManagement() {
  console.log('🔄 Validating Session Management...\n');
  
  // Test 1: Session Creation
  console.log('Testing session creation...');
  const loginResponse = await fetch('http://localhost:5173/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const { token } = await loginResponse.json();
  assert(token, 'Session token should be created on login');
  console.log('✅ Session created successfully');
  
  // Test 2: Session Validation
  console.log('Testing session validation...');
  const validationResponse = await fetch('http://localhost:5173/api/auth/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  assert(validationResponse.status === 200, 'Valid session should be accepted');
  console.log('✅ Session validation successful');
  
  // Test 3: Session Expiration (if implemented)
  console.log('Testing session behavior...');
  
  // Test 4: Session Cleanup
  console.log('Testing session cleanup...');
  const logoutResponse = await fetch('http://localhost:5173/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // After logout, token should be invalid
  const postLogoutResponse = await fetch('http://localhost:5173/api/auth/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  assert(postLogoutResponse.status === 401, 'Token should be invalid after logout');
  console.log('✅ Session cleanup successful');
  
  console.log('\n🎉 Session management validation completed');
}
```

## ✅ Writing Validation Tests

### Validation Test Structure
```javascript
async function validateComponentName() {
  console.log('🔍 Validating Component Name...\n');
  
  const validationResults = [];
  
  try {
    // Test Case 1: Valid scenarios
    console.log('1. Testing valid scenarios...');
    await testValidScenarios();
    validationResults.push({ test: 'Valid scenarios', passed: true });
    
    // Test Case 2: Invalid scenarios
    console.log('2. Testing invalid scenarios...');
    await testInvalidScenarios();
    validationResults.push({ test: 'Invalid scenarios', passed: true });
    
    // Test Case 3: Edge cases
    console.log('3. Testing edge cases...');
    await testEdgeCases();
    validationResults.push({ test: 'Edge cases', passed: true });
    
    // Test Case 4: Error handling
    console.log('4. Testing error handling...');
    await testErrorHandling();
    validationResults.push({ test: 'Error handling', passed: true });
    
    console.log('\n🎉 All validation tests passed!');
    return { success: true, results: validationResults };
    
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    return { success: false, error: error.message, results: validationResults };
  }
}
```

### Best Practices for Validation Tests

1. **Comprehensive Coverage**: Test all business rules and constraints
2. **Realistic Scenarios**: Use real-world data and situations
3. **Security Focus**: Always test security boundaries
4. **Performance Awareness**: Validate performance requirements
5. **Error Scenarios**: Test all failure modes
6. **Data Integrity**: Verify data consistency and validity

### Adding New Validation Tests

1. **Identify validation requirements** from business rules
2. **Create focused test functions** for each validation area
3. **Include both positive and negative test cases**
4. **Add comprehensive error handling**
5. **Document the validation logic** and expected outcomes
6. **Integrate with existing validation framework**

## 🐛 Troubleshooting Validation Tests

### Common Issues
1. **Test environment state** - Ensure clean state between tests
2. **Network dependencies** - Handle network timeouts and failures
3. **Data dependencies** - Ensure required test data exists
4. **Timing issues** - Add appropriate waits for async operations

### Debugging Tips
```javascript
// Add detailed logging
console.log('Validation step:', stepName);
console.log('Input data:', inputData);
console.log('Expected result:', expectedResult);
console.log('Actual result:', actualResult);

// Use assertions with meaningful messages
assert(condition, `Validation failed: expected ${expected}, got ${actual}`);

// Add timeout handling
const result = await Promise.race([
  performValidation(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Validation timeout')), 10000)
  )
]);
```

This validation testing framework ensures that your application maintains high quality, security, and reliability standards throughout development and deployment.
