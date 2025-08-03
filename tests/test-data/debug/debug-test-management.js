// Simple test to check page functionality
console.log('🔧 Debug script starting...');

// Test if we can access the page elements
setTimeout(() => {
  console.log('🔍 Checking page elements...');
  
  const tbody = document.getElementById('testTableBody');
  console.log('testTableBody found:', !!tbody);
  
  const welcomeMessage = document.getElementById('welcomeMessage');
  console.log('welcomeMessage found:', !!welcomeMessage);
  
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">DEBUG: Script is working! If you see this, the issue is elsewhere.</td></tr>';
  }
  
  // Check if we can make a simple API call
  fetch('/api/tests', {
    credentials: 'include'
  })
  .then(response => {
    console.log('API test response status:', response.status);
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  })
  .then(data => {
    console.log('API test successful:', {
      totalTests: data.totalTests,
      testsArrayLength: data.tests ? data.tests.length : 0
    });
    
    if (tbody && data.tests && data.tests.length > 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">DEBUG: API returned ${data.totalTests} tests. Main script should work.</td></tr>`;
    }
  })
  .catch(error => {
    console.error('API test failed:', error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">DEBUG: API call failed - ${error.message}</td></tr>`;
    }
  });
  
}, 2000);
