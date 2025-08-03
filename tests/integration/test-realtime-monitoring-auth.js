const axios = require('axios')

// Create an axios instance with cookie support
const client = axios.create({
  baseURL: 'http://localhost:5173',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

async function testRealTimeMonitoring() {
  try {
    console.log('🚀 Testing Real-time Test Execution Monitoring...')
    console.log('')
    
    // First, try to login
    console.log('🔑 Attempting to login...')
    const loginResponse = await client.post('/api/login', {
      username: 'admin',
      password: 'admin123'
    })
    
    console.log('✅ Login successful!')
    
    // Now run the tests
    console.log('🧪 Starting test execution...')
    const response = await client.post('/api/tests/run', {
      testPattern: 'tests/realtime-demo.spec.ts',
      reporter: 'json'
    })
    
    console.log('✅ Test execution started successfully!')
    console.log('📊 Response:', response.data)
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)
    if (error.response?.status === 401) {
      console.log('🔒 Authentication required. Please check credentials.')
    }
  }
}

testRealTimeMonitoring()
