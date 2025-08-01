// Test complete authentication flow
const http = require('http');
const querystring = require('querystring');

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

async function testAuthFlow() {
  console.log('🧪 Testing complete authentication flow...\n');
  
  try {
    // Step 1: Login and get session cookie
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
      const loginResult = JSON.parse(loginResponse.body);
      console.log(`   User: ${loginResult.user.firstName} ${loginResult.user.lastName}`);
      
      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];
      let sessionCookie = '';
      if (cookies) {
        sessionCookie = cookies.find(cookie => cookie.startsWith('connect.sid='));
        console.log(`   Session cookie: ${sessionCookie ? 'Present' : 'Missing'}`);
      }
      
      if (!sessionCookie) {
        console.log('❌ No session cookie received');
        return;
      }
      
      // Step 2: Test accessing users API with session cookie
      console.log('\nStep 2: Testing users API with session...');
      const usersResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/users',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      if (usersResponse.statusCode === 200) {
        const users = JSON.parse(usersResponse.body);
        console.log(`✅ Users API working - Found ${users.length} users`);
        console.log('   Sample user:', users[0]?.first_name, users[0]?.last_name);
      } else {
        console.log(`❌ Users API failed - Status: ${usersResponse.statusCode}`);
        console.log('   Response:', usersResponse.body);
      }
      
      // Step 3: Test accessing settings API
      console.log('\nStep 3: Testing settings API with session...');
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
      
    } else {
      console.log(`❌ Login failed - Status: ${loginResponse.statusCode}`);
      console.log('   Response:', loginResponse.body);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow();
