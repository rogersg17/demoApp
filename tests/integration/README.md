# Integration Tests

This folder contains cross-component integration testing, WebSocket connections, system interactions, and multi-service workflow validation.

## 🎯 Purpose

Integration tests verify that different components of the system work together correctly. These tests focus on data flow, communication between services, and end-to-end workflows.

## 📁 Test Files

### WebSocket & Real-time Features
- `test-websocket-simple.js` - Basic WebSocket connection testing
- `test-websocket-monitoring.js` - WebSocket monitoring and message handling
- `test-realtime-monitoring.js` - Real-time monitoring system testing
- `test-realtime-monitoring-auth.js` - Authenticated real-time monitoring

### System Integration
- `test-phase1.js` - Phase 1 system integration validation
- `test-react-frontend.js` - React frontend integration testing
- `test-playwright-debug.js` - Playwright integration debugging

### Application Workflows
- `test-workflow.js` - Complete application workflow testing
- `test-test-management-auth.js` - Test management with authentication
- `test-selected-api.js` - Selected API integration testing
- `test-tests-api.js` - Test execution API integration

## 🚀 Running Integration Tests

### All Integration Tests
```bash
npm run test:integration                    # Run all integration tests
npm run test:integration:websocket         # WebSocket specific tests
npm run test:integration:workflows         # Workflow integration tests
```

### Individual Test Categories
```bash
# WebSocket Integration
node tests/integration/test-websocket-simple.js
node tests/integration/test-websocket-monitoring.js

# System Integration  
node tests/integration/test-phase1.js
node tests/integration/test-react-frontend.js

# Workflow Testing
node tests/integration/test-workflow.js
node tests/integration/test-test-management-auth.js
```

### Real-time Monitoring
```bash
# Real-time system testing
node tests/integration/test-realtime-monitoring.js
node tests/integration/test-realtime-monitoring-auth.js
```

## 🔗 Integration Test Types

### 1. WebSocket Integration
Tests real-time communication between client and server:
- Connection establishment and maintenance
- Message sending and receiving
- Authentication over WebSocket
- Connection recovery and reconnection

### 2. API Integration
Tests interaction between different API endpoints:
- Multi-step workflows
- Data consistency across endpoints
- Authentication state management
- Error propagation and handling

### 3. Database Integration
Tests data flow and persistence:
- Database operations during workflows
- Transaction integrity
- Data synchronization
- Concurrent access handling

### 4. Frontend-Backend Integration
Tests communication between React frontend and Node.js backend:
- API consumption from frontend
- Authentication flow
- Real-time updates
- Error handling and user feedback

## 🔧 Test Environment Setup

### Prerequisites
```bash
# Start all required services
npm start                    # Backend server
npm run dev                  # Frontend development server (if separate)
```

### Environment Configuration
- **Backend**: `http://localhost:3000` or `http://localhost:5173`
- **Frontend**: React development server
- **WebSocket**: Same port as backend with `/socket.io` path
- **Database**: SQLite database should be initialized

### Test Data Setup
```javascript
// Common setup for integration tests
const testConfig = {
  serverUrl: 'http://localhost:5173',
  wsUrl: 'ws://localhost:5173',
  testUser: { username: 'admin', password: 'admin123' },
  timeout: 30000
};
```

## 🧪 WebSocket Testing

### Basic Connection Test
```javascript
const io = require('socket.io-client');

async function testWebSocketConnection() {
  const socket = io('http://localhost:5173');
  
  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      socket.disconnect();
      resolve();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection failed:', error);
      reject(error);
    });
    
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}
```

### Message Flow Testing
```javascript
async function testMessageFlow() {
  const socket = io('http://localhost:5173');
  
  socket.emit('test-message', { data: 'test' });
  
  socket.on('test-response', (data) => {
    console.log('Received response:', data);
    assert(data.success === true);
  });
}
```

## 🔄 Workflow Testing

### Multi-step Process Testing
```javascript
async function testCompleteWorkflow() {
  console.log('Testing complete workflow...');
  
  // Step 1: Authentication
  const auth = await authenticateUser();
  console.log('✅ Authentication successful');
  
  // Step 2: Create test data
  const testData = await createTestData(auth);
  console.log('✅ Test data created');
  
  // Step 3: Process workflow
  const result = await processWorkflow(testData, auth);
  console.log('✅ Workflow processed');
  
  // Step 4: Validate results
  await validateResults(result);
  console.log('✅ Results validated');
  
  // Step 5: Cleanup
  await cleanupTestData(testData, auth);
  console.log('✅ Cleanup completed');
}
```

## 📊 Data Flow Testing

### Cross-Component Data Validation
```javascript
async function testDataFlow() {
  // Create data through API
  const created = await createViaAPI(testData);
  
  // Verify data in database
  const stored = await queryDatabase(created.id);
  assert(stored.value === created.value);
  
  // Verify data through different API
  const retrieved = await getViaAPI(created.id);
  assert(retrieved.value === created.value);
  
  // Verify real-time updates
  const updated = await updateViaAPI(created.id, newValue);
  // Check WebSocket notification was sent
  await waitForWebSocketUpdate(created.id);
}
```

## 🚨 Error Handling Testing

### System Resilience Testing
```javascript
async function testErrorHandling() {
  // Test network failures
  await testNetworkFailure();
  
  // Test authentication failures
  await testAuthFailure();
  
  // Test database connection issues
  await testDatabaseFailure();
  
  // Test concurrent access
  await testConcurrentAccess();
}
```

## ⚡ Performance Integration

### Load Testing Integration Points
```javascript
async function testLoadIntegration() {
  const concurrent = 10;
  const promises = [];
  
  for (let i = 0; i < concurrent; i++) {
    promises.push(testCompleteWorkflow());
  }
  
  const start = Date.now();
  await Promise.all(promises);
  const duration = Date.now() - start;
  
  console.log(`${concurrent} concurrent workflows completed in ${duration}ms`);
}
```

## ✅ Writing Integration Tests

### Test Structure
```javascript
const fetch = require('node-fetch');
const io = require('socket.io-client');

async function testIntegrationScenario() {
  console.log('🔗 Testing Integration Scenario...\n');
  
  try {
    // Setup
    await setupTestEnvironment();
    
    // Test integration points
    await testComponentA();
    await testComponentBIntegration();
    await testDataFlow();
    await testRealTimeUpdates();
    
    // Validate end-to-end result
    await validateFinalState();
    
    console.log('\n🎉 Integration test passed!');
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestEnvironment();
  }
}
```

### Best Practices
1. **Test realistic workflows** - Use actual user scenarios
2. **Include error scenarios** - Test failure modes and recovery
3. **Validate data consistency** - Check data across all components
4. **Test timing-dependent features** - Handle asynchronous operations
5. **Clean up after tests** - Reset system state for next test

## 🐛 Troubleshooting

### Common Issues
1. **Service dependencies** - Ensure all required services are running
2. **Timing issues** - Add appropriate waits for asynchronous operations
3. **Data consistency** - Check database state between test steps
4. **WebSocket connections** - Verify WebSocket server is accessible

### Debugging Tips
```javascript
// Add detailed logging
console.log('Step 1: Starting authentication...');
console.log('Auth response:', authResponse);

// Use timeouts for async operations
const result = await Promise.race([
  performOperation(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 10000)
  )
]);

// Verify intermediate states
console.log('Database state after step 2:', await getDatabaseState());
```

## 📋 Adding New Integration Tests

1. **Identify integration points** - Determine which components interact
2. **Define test scenarios** - Map out realistic user workflows
3. **Setup test environment** - Ensure all dependencies are available
4. **Write step-by-step tests** - Break complex workflows into steps
5. **Add validation points** - Check system state at each step
6. **Include error scenarios** - Test failure modes and recovery
7. **Document the test** - Explain what integration is being tested

### Example Integration Test Template
```javascript
const fetch = require('node-fetch');
const io = require('socket.io-client');

async function testNewIntegration() {
  console.log('🔗 Testing New Integration...\n');
  
  let socket;
  let testData;
  
  try {
    // Setup
    console.log('1. Setting up test environment...');
    socket = io('http://localhost:5173');
    await waitForSocketConnection(socket);
    
    // Authentication
    console.log('2. Authenticating...');
    const auth = await authenticate();
    
    // Integration Test Steps
    console.log('3. Testing integration point A...');
    testData = await testIntegrationPointA(auth);
    
    console.log('4. Testing integration point B...');
    await testIntegrationPointB(testData, auth);
    
    console.log('5. Validating data flow...');
    await validateDataFlow(testData);
    
    console.log('6. Testing real-time updates...');
    await testRealTimeIntegration(socket, testData);
    
    console.log('\n🎉 New integration test passed!');
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (socket) socket.disconnect();
    if (testData) await cleanupTestData(testData);
  }
}

// Run the test
testNewIntegration().catch(console.error);
```
