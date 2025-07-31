const axios = require('axios');

async function testApiTests() {
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Cookies:', cookies);
    
    let sessionCookie = null;
    if (cookies) {
      sessionCookie = cookies.find(c => c.includes('connect.sid='));
      if (sessionCookie) {
        // Extract just the cookie part before the first semicolon
        sessionCookie = sessionCookie.split(';')[0];
      }
    }
    
    console.log('✅ Using cookie:', sessionCookie);
    
    console.log('📡 Calling /api/tests...');
    const testsResponse = await axios.get('http://localhost:3000/api/tests', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('📊 Response summary:');
    console.log(`  Total: ${testsResponse.data.totalTests}`);
    console.log(`  Passing: ${testsResponse.data.passingTests}`);
    console.log(`  Failing: ${testsResponse.data.failingTests}`);
    console.log(`  Last Run: ${testsResponse.data.lastRun}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testApiTests();
