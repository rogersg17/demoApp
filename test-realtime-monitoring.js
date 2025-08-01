const axios = require('axios')

async function testRealTimeMonitoring() {
  try {
    console.log('🚀 Testing Real-time Test Execution Monitoring...')
    console.log('')
    
    const response = await axios.post('http://localhost:5173/api/tests/run', {
      testPattern: 'tests/realtime-demo.spec.ts',
      reporter: 'json'
    })
    
    console.log('✅ Test execution started successfully!')
    console.log('📊 Response:', response.data)
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message)
  }
}

testRealTimeMonitoring()
