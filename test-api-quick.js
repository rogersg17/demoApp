// Simple API test script
console.log('🧪 Testing User API endpoints...');

async function testAPI() {
  try {
    // Test login first
    console.log('1. Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      console.log('✅ Login successful');
      
      // Extract session cookie
      const cookie = loginResponse.headers.get('set-cookie');
      console.log('🍪 Session cookie:', cookie ? 'Set' : 'Not set');
      
      // Test users API
      console.log('2. Testing users API...');
      const usersResponse = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Cookie': cookie || ''
        }
      });
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log(`✅ Users API working - Found ${users.length} users`);
        console.log('📋 Sample user:', users[0] ? users[0].username : 'No users');
      } else {
        console.log(`❌ Users API failed with status: ${usersResponse.status}`);
        const error = await usersResponse.text();
        console.log('Error:', error);
      }
    } else {
      console.log(`❌ Login failed with status: ${loginResponse.status}`);
      const error = await loginResponse.text();
      console.log('Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
