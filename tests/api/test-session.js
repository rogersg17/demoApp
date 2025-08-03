// Test current session status
(async function testSession() {
  try {
    console.log('Testing session status...');
    
    // Test if we can access protected endpoint
    const response = await fetch('/api/users', {
      credentials: 'include' // Important: include cookies
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Session is valid - Users found:', data.length);
      return true;
    } else {
      console.log('❌ Session invalid - Status:', response.status);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Session test failed:', error);
    return false;
  }
})();

// Also check sessionStorage
console.log('SessionStorage contents:');
console.log('- loggedInUser:', sessionStorage.getItem('loggedInUser'));
console.log('- userId:', sessionStorage.getItem('userId'));
console.log('- userRole:', sessionStorage.getItem('userRole'));
