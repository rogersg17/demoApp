// Test authentication flow for test management page
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

async function testTestManagementAuth() {
  console.log('🧪 Testing test management authentication...\n');
  
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
      
      console.log('   Session cookie received');
      
      // Step 2: Test /api/settings endpoint (test management checks this)
      console.log('\nStep 2: Testing /api/settings endpoint...');
      const settingsResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/settings',
        method: 'HEAD',
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      if (settingsResponse.statusCode === 200) {
        console.log('✅ Settings API accessible');
      } else {
        console.log(`❌ Settings API failed - Status: ${settingsResponse.statusCode}`);
      }
      
      // Step 3: Test /api/tests endpoint
      console.log('\nStep 3: Testing /api/tests endpoint...');
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
        console.log(`✅ Tests API working - ${testsData.totalTests} tests found`);
      } else {
        console.log(`❌ Tests API failed - Status: ${testsResponse.statusCode}`);
        console.log('   Response:', testsResponse.body);
      }
      
    } else {
      console.log(`❌ Login failed - Status: ${loginResponse.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTestManagementAuth();
