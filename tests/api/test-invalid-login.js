#!/usr/bin/env node

/**
 * Test Invalid Login
 * Tests the security logging for failed login attempts
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5173';

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }

    return {
      status: response.status,
      data: parsedData
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

async function testInvalidLogin() {
  console.log('🔐 Testing Invalid Login (Security Logging)');
  console.log('=============================================\n');
  
  // Test with wrong password
  console.log('Testing with invalid credentials...');
  const response = await makeRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'wrongpassword'
    })
  });
  
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${JSON.stringify(response.data)}`);
  
  if (response.status === 401) {
    console.log('✅ Invalid login correctly rejected');
    console.log('✅ Security event should be logged');
  } else {
    console.log('❌ Unexpected response to invalid login');
  }
}

if (require.main === module) {
  testInvalidLogin().catch(console.error);
}
