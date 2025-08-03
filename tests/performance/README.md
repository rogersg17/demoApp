# Performance Tests

This folder contains performance testing, load testing, benchmarking, and system performance validation to ensure the application meets performance requirements under various conditions.

## 🎯 Purpose

Performance tests verify that the application performs efficiently under normal and stress conditions, identifying bottlenecks, measuring response times, and validating scalability requirements.

## 📁 Current Status

⚠️ **Note**: This folder is currently empty but prepared for performance test implementation. Performance testing should be added as the system grows and performance requirements are defined.

## 🚀 Running Performance Tests

### When Performance Tests Are Added
```bash
npm run test:performance                    # Run all performance tests
npm run test:performance:load              # Load testing
npm run test:performance:stress            # Stress testing  
npm run test:performance:benchmark         # Benchmark testing
npm run test:performance:memory            # Memory usage testing
```

### Individual Performance Categories (Future)
```bash
npm run test:performance:api               # API performance testing
npm run test:performance:database          # Database performance
npm run test:performance:frontend          # Frontend performance
npm run test:performance:websocket         # WebSocket performance
```

## 📊 Performance Test Framework

### Recommended Testing Stack
- **Load Testing**: Artillery, K6, or Apache Bench
- **API Performance**: Supertest with timing
- **Frontend Performance**: Lighthouse CI, WebPageTest
- **Memory Testing**: Clinic.js, memwatch-next
- **Profiling**: Node.js --inspect, Chrome DevTools

### Setup Example (Artillery)
```yaml
# artillery.yml
config:
  target: 'http://localhost:5173'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  processor: "./performance-processor.js"

scenarios:
  - name: "API Load Test"
    weight: 70
    flow:
      - post:
          url: "/auth/login"
          json:
            username: "admin"
            password: "admin123"
          capture:
            json: "$.token"
            as: "authToken"
      - get:
          url: "/api/dashboard/stats"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - get:
          url: "/api/test-results"
          headers:
            Authorization: "Bearer {{ authToken }}"
  
  - name: "WebSocket Test"
    weight: 30
    engine: ws
    flow:
      - connect:
          url: "ws://localhost:5173/socket.io/?EIO=4&transport=websocket"
      - send: '42["test-message",{"data":"performance test"}]'
      - think: 1
```

## 📋 Performance Test Categories

### 1. API Performance Tests
Test API response times and throughput:

```javascript
// Example: tests/performance/api-performance.test.js
const supertest = require('supertest');
const app = require('../../server');

describe('API Performance Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    // Setup authentication
    const response = await supertest(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = response.body.token;
  });
  
  describe('Dashboard API Performance', () => {
    it('should respond within 500ms for dashboard stats', async () => {
      const startTime = Date.now();
      
      const response = await supertest(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
        
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500);
      expect(response.body).toBeDefined();
      
      console.log(`Dashboard stats response time: ${responseTime}ms`);
    });
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          supertest(app)
            .get('/api/test-results')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        );
      }
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / concurrentRequests;
      
      expect(avgTime).toBeLessThan(200);
      console.log(`Average response time for ${concurrentRequests} concurrent requests: ${avgTime.toFixed(2)}ms`);
    });
  });
});
```

### 2. Database Performance Tests
Test database query performance:

```javascript
// Example: tests/performance/database-performance.test.js
const db = require('../../database/database');

describe('Database Performance Tests', () => {
  describe('Query Performance', () => {
    it('should execute test results query within time limit', async () => {
      const startTime = Date.now();
      
      const results = await db.query(`
        SELECT * FROM test_results 
        ORDER BY timestamp DESC 
        LIMIT 100
      `);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100); // 100ms limit
      expect(results.length).toBeGreaterThan(0);
      
      console.log(`Query execution time: ${queryTime}ms`);
    });
    
    it('should handle large dataset queries efficiently', async () => {
      // Insert test data if needed
      await insertTestData(1000);
      
      const startTime = Date.now();
      
      const results = await db.query(`
        SELECT 
          test_name,
          AVG(duration) as avg_duration,
          COUNT(*) as execution_count
        FROM test_results 
        WHERE timestamp > datetime('now', '-30 days')
        GROUP BY test_name
        ORDER BY avg_duration DESC
      `);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(500); // 500ms limit for complex query
      expect(results.length).toBeGreaterThan(0);
      
      console.log(`Complex query execution time: ${queryTime}ms`);
    });
  });
  
  describe('Insert Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      const testRecords = generateTestRecords(100);
      
      const startTime = Date.now();
      
      await db.transaction(async (tx) => {
        for (const record of testRecords) {
          await tx.run(
            'INSERT INTO test_results (test_name, status, duration, timestamp) VALUES (?, ?, ?, ?)',
            [record.name, record.status, record.duration, record.timestamp]
          );
        }
      });
      
      const insertTime = Date.now() - startTime;
      
      expect(insertTime).toBeLessThan(1000); // 1 second for 100 inserts
      
      console.log(`Bulk insert time for 100 records: ${insertTime}ms`);
    });
  });
});
```

### 3. Load Testing
Test system behavior under expected load:

```javascript
// Example: tests/performance/load-test.js
const autocannon = require('autocannon');
const fetch = require('node-fetch');

async function runLoadTest() {
  console.log('🚀 Starting Load Test...\n');
  
  // Get authentication token
  const authResponse = await fetch('http://localhost:5173/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const { token } = await authResponse.json();
  
  // Load test configuration
  const loadTestConfig = {
    url: 'http://localhost:5173',
    connections: 20, // concurrent connections
    duration: 60, // 60 seconds
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    requests: [
      {
        method: 'GET',
        path: '/api/dashboard/stats'
      },
      {
        method: 'GET', 
        path: '/api/test-results'
      },
      {
        method: 'POST',
        path: '/api/test-results',
        body: JSON.stringify({
          testName: 'load-test-sample',
          status: 'passed',
          duration: 150
        })
      }
    ]
  };
  
  try {
    const result = await autocannon(loadTestConfig);
    
    console.log('📊 Load Test Results:');
    console.log(`   Requests: ${result.requests.total}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   RPS: ${result.requests.average}`);
    console.log(`   Latency: ${result.latency.average}ms avg`);
    console.log(`   Throughput: ${result.throughput.average} bytes/sec`);
    console.log(`   Errors: ${result.errors}`);
    
    // Validate performance requirements
    const avgLatency = result.latency.average;
    const errorRate = (result.errors / result.requests.total) * 100;
    
    if (avgLatency > 500) {
      console.warn(`⚠️  High latency: ${avgLatency}ms (target: <500ms)`);
    }
    
    if (errorRate > 1) {
      console.error(`❌ High error rate: ${errorRate.toFixed(2)}% (target: <1%)`);
    }
    
    if (result.requests.average < 100) {
      console.warn(`⚠️  Low throughput: ${result.requests.average} RPS (target: >100 RPS)`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    throw error;
  }
}

// Run load test
if (require.main === module) {
  runLoadTest().catch(console.error);
}

module.exports = { runLoadTest };
```

### 4. Stress Testing
Test system behavior under extreme conditions:

```javascript
// Example: tests/performance/stress-test.js
async function runStressTest() {
  console.log('💥 Starting Stress Test...\n');
  
  const stressConfig = {
    url: 'http://localhost:5173',
    connections: 100, // High concurrent connections
    duration: 120, // 2 minutes
    overallRate: 1000, // 1000 requests per second
    amount: 10000 // Total requests
  };
  
  const result = await autocannon(stressConfig);
  
  console.log('💥 Stress Test Results:');
  console.log(`   Total Requests: ${result.requests.total}`);
  console.log(`   Failed Requests: ${result.errors}`);
  console.log(`   Success Rate: ${((result.requests.total - result.errors) / result.requests.total * 100).toFixed(2)}%`);
  console.log(`   Peak RPS: ${result.requests.max}`);
  console.log(`   95th Percentile Latency: ${result.latency.p95}ms`);
  console.log(`   99th Percentile Latency: ${result.latency.p99}ms`);
  
  // System should maintain >95% success rate under stress
  const successRate = (result.requests.total - result.errors) / result.requests.total;
  if (successRate < 0.95) {
    console.error(`❌ System failed under stress: ${(successRate * 100).toFixed(2)}% success rate`);
  } else {
    console.log('✅ System maintained stability under stress');
  }
  
  return result;
}
```

### 5. Memory Performance Testing
Test memory usage and detect leaks:

```javascript
// Example: tests/performance/memory-test.js
const memwatch = require('memwatch-next');

function runMemoryTest() {
  console.log('🧠 Starting Memory Performance Test...\n');
  
  let memoryLeaks = [];
  let heapDiffs = [];
  
  // Monitor memory leaks
  memwatch.on('leak', (info) => {
    console.warn('⚠️  Memory leak detected:', info);
    memoryLeaks.push(info);
  });
  
  // Take heap snapshots
  const hd = new memwatch.HeapDiff();
  
  return new Promise((resolve) => {
    // Simulate application workload
    const interval = setInterval(async () => {
      try {
        // Perform memory-intensive operations
        await performWorkload();
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
      } catch (error) {
        console.error('Error during workload:', error);
      }
    }, 1000);
    
    // Stop test after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      
      const diff = hd.end();
      heapDiffs.push(diff);
      
      console.log('🧠 Memory Test Results:');
      console.log(`   Memory Leaks Detected: ${memoryLeaks.length}`);
      console.log(`   Heap Size Change: ${diff.change.size_bytes} bytes`);
      console.log(`   Objects Released: ${diff.change.released_nodes}`);
      console.log(`   Objects Allocated: ${diff.change.allocated_nodes}`);
      
      resolve({
        leaks: memoryLeaks,
        heapDiff: diff,
        success: memoryLeaks.length === 0
      });
    }, 30000);
  });
}

async function performWorkload() {
  // Simulate typical application operations
  const data = [];
  
  // Create and process data
  for (let i = 0; i < 1000; i++) {
    data.push({
      id: i,
      name: `test-${i}`,
      timestamp: new Date(),
      data: Buffer.alloc(1024) // 1KB buffer
    });
  }
  
  // Process data
  const processed = data.map(item => ({
    ...item,
    processed: true,
    processTime: Date.now()
  }));
  
  // Clear references
  data.length = 0;
  processed.length = 0;
}
```

## ⚡ WebSocket Performance Testing

### Real-time Performance Testing
```javascript
// Example: tests/performance/websocket-performance.test.js
const io = require('socket.io-client');

async function testWebSocketPerformance() {
  console.log('⚡ Testing WebSocket Performance...\n');
  
  const results = {
    connectionTime: 0,
    messageLatency: [],
    throughput: 0,
    errors: 0
  };
  
  try {
    // Test connection performance
    const connectionStart = Date.now();
    const socket = io('http://localhost:5173');
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        results.connectionTime = Date.now() - connectionStart;
        console.log(`✅ WebSocket connected in ${results.connectionTime}ms`);
        resolve();
      });
      
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Test message latency
    console.log('Testing message latency...');
    for (let i = 0; i < 100; i++) {
      const messageStart = Date.now();
      
      socket.emit('ping', { timestamp: messageStart });
      
      await new Promise((resolve) => {
        socket.once('pong', () => {
          const latency = Date.now() - messageStart;
          results.messageLatency.push(latency);
          resolve();
        });
      });
    }
    
    // Test throughput
    console.log('Testing message throughput...');
    const throughputStart = Date.now();
    const messageCount = 1000;
    
    for (let i = 0; i < messageCount; i++) {
      socket.emit('test-message', { data: `message-${i}` });
    }
    
    const throughputTime = Date.now() - throughputStart;
    results.throughput = (messageCount / throughputTime) * 1000; // messages per second
    
    socket.disconnect();
    
    // Calculate statistics
    const avgLatency = results.messageLatency.reduce((a, b) => a + b, 0) / results.messageLatency.length;
    const maxLatency = Math.max(...results.messageLatency);
    const minLatency = Math.min(...results.messageLatency);
    
    console.log('⚡ WebSocket Performance Results:');
    console.log(`   Connection Time: ${results.connectionTime}ms`);
    console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Min Latency: ${minLatency}ms`);
    console.log(`   Max Latency: ${maxLatency}ms`);
    console.log(`   Throughput: ${results.throughput.toFixed(2)} messages/sec`);
    
    // Validate performance requirements
    if (avgLatency > 50) {
      console.warn(`⚠️  High WebSocket latency: ${avgLatency.toFixed(2)}ms (target: <50ms)`);
    }
    
    if (results.throughput < 500) {
      console.warn(`⚠️  Low WebSocket throughput: ${results.throughput.toFixed(2)} msg/sec (target: >500 msg/sec)`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ WebSocket performance test failed:', error.message);
    results.errors++;
    throw error;
  }
}
```

## 📊 Performance Monitoring

### Continuous Performance Monitoring
```javascript
// Example: tests/performance/performance-monitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      responseTime: [],
      throughput: [],
      errorRate: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }
  
  async startMonitoring(duration = 300000) { // 5 minutes default
    console.log('📊 Starting Performance Monitoring...\n');
    
    const interval = setInterval(async () => {
      await this.collectMetrics();
    }, 5000); // Collect every 5 seconds
    
    setTimeout(() => {
      clearInterval(interval);
      this.generateReport();
    }, duration);
  }
  
  async collectMetrics() {
    try {
      // Response time metric
      const start = Date.now();
      await fetch('http://localhost:5173/api/dashboard/stats');
      const responseTime = Date.now() - start;
      this.metrics.responseTime.push(responseTime);
      
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push(memUsage.heapUsed);
      
      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.metrics.cpuUsage.push(cpuUsage.user + cpuUsage.system);
      
    } catch (error) {
      console.error('Error collecting metrics:', error.message);
    }
  }
  
  generateReport() {
    console.log('📊 Performance Monitoring Report:');
    
    // Response time analysis
    const avgResponseTime = this.average(this.metrics.responseTime);
    const p95ResponseTime = this.percentile(this.metrics.responseTime, 95);
    
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   95th Percentile Response Time: ${p95ResponseTime.toFixed(2)}ms`);
    
    // Memory analysis
    const avgMemory = this.average(this.metrics.memoryUsage);
    const maxMemory = Math.max(...this.metrics.memoryUsage);
    
    console.log(`   Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Peak Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    
    // Performance alerts
    if (avgResponseTime > 1000) {
      console.warn('⚠️  High average response time detected!');
    }
    
    if (maxMemory > 512 * 1024 * 1024) { // 512MB
      console.warn('⚠️  High memory usage detected!');
    }
  }
  
  average(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
  }
  
  percentile(array, p) {
    const sorted = [...array].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}
```

## ✅ Writing Performance Tests

### Performance Test Template
```javascript
async function performanceTestTemplate() {
  console.log('⚡ Performance Test Template...\n');
  
  const results = {
    testName: 'Template Test',
    startTime: Date.now(),
    metrics: {},
    success: false
  };
  
  try {
    // 1. Setup
    console.log('Setting up performance test...');
    await setupPerformanceTest();
    
    // 2. Baseline measurement
    console.log('Taking baseline measurements...');
    const baseline = await measureBaseline();
    
    // 3. Load test
    console.log('Running load test...');
    const loadResults = await runLoadTest();
    
    // 4. Stress test  
    console.log('Running stress test...');
    const stressResults = await runStressTest();
    
    // 5. Analysis
    console.log('Analyzing results...');
    results.metrics = {
      baseline,
      load: loadResults,
      stress: stressResults
    };
    
    // 6. Validation
    results.success = validatePerformanceRequirements(results.metrics);
    
    console.log('⚡ Performance test completed');
    return results;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    results.error = error.message;
    return results;
  } finally {
    // Cleanup
    await cleanupPerformanceTest();
    results.duration = Date.now() - results.startTime;
    console.log(`Test duration: ${results.duration}ms`);
  }
}
```

### Best Practices for Performance Testing

1. **Establish baselines** before making changes
2. **Test realistic scenarios** with actual user patterns  
3. **Use production-like data volumes**
4. **Test under various load conditions**
5. **Monitor system resources** during tests
6. **Set clear performance requirements**
7. **Automate performance testing** in CI/CD pipeline

## 📋 Adding Performance Tests

1. **Define performance requirements** (response time, throughput, etc.)
2. **Identify critical user journeys** and API endpoints
3. **Create load test scenarios** with realistic usage patterns
4. **Set up monitoring** for key metrics
5. **Establish performance thresholds** and alerts
6. **Integrate with CI/CD** for continuous performance validation

This performance testing framework ensures your application maintains optimal performance characteristics as it scales and evolves.
