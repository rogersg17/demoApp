// Test the /api/tests endpoint
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testTestsAPI() {
  console.log('🧪 Testing /api/tests endpoint...\n');
  
  try {
    // Step 1: Login to get session cookie
    console.log('Step 1: Logging in...');
    const loginData = JSON.stringify({ username: 'jdoe', password: 'password123' });
    
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);
    
    if (loginResponse.statusCode === 200) {
      console.log('✅ Login successful');
      
      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];
      let sessionCookie = '';
      if (cookies) {
        sessionCookie = cookies.find(cookie => cookie.startsWith('connect.sid='));
      }
      
      if (!sessionCookie) {
        console.log('❌ No session cookie received');
        return;
      }
      
      // Step 2: Test /api/tests endpoint
      console.log('\nStep 2: Testing /api/tests endpoint...');
      const testsResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/tests',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      if (testsResponse.statusCode === 200) {
        const testsData = JSON.parse(testsResponse.body);
        console.log(`✅ Tests API working`);
        console.log(`   Total tests: ${testsData.totalTests}`);
        console.log(`   Tests array length: ${testsData.tests ? testsData.tests.length : 0}`);
        console.log(`   Passing: ${testsData.passingTests}`);
        console.log(`   Failing: ${testsData.failingTests}`);
        console.log(`   Last run: ${testsData.lastRun || 'Never'}`);
        
        if (testsData.tests && testsData.tests.length > 0) {
          console.log(`   Sample test: ${testsData.tests[0].name} (${testsData.tests[0].suite})`);
        } else {
          console.log('   ⚠️ No tests found in array');
        }
      } else {
        console.log(`❌ Tests API failed - Status: ${testsResponse.statusCode}`);
        console.log('   Response:', testsResponse.body);
      }
      
    } else {
      console.log(`❌ Login failed - Status: ${loginResponse.statusCode}`);
      console.log('   Response:', loginResponse.body);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTestsAPI();
