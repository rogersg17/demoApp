const io = require('socket.io-client')

console.log('🔌 Testing WebSocket Real-time Monitoring...')
console.log('')

// Connect to the WebSocket server
const socket = io('http://localhost:5173')

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server!')
  console.log('🆔 Socket ID:', socket.id)
  
  // Join the test monitoring room
  socket.emit('join-test-monitoring', { userId: 'test-user' })
  console.log('📡 Joined test monitoring room')
  
  // Listen for real-time test events
  socket.on('test-started', (data) => {
    console.log('🚀 Test Started:', data)
  })
  
  socket.on('test-progress', (data) => {
    console.log('📊 Test Progress:', data)
  })
  
  socket.on('test-log', (data) => {
    console.log('📝 Test Log:', data)
  })
  
  socket.on('test-completed', (data) => {
    console.log('✅ Test Completed:', data)
    process.exit(0)
  })
  
  socket.on('test-failed', (data) => {
    console.log('❌ Test Failed:', data)
    process.exit(0)
  })
  
  // Simulate test execution by manually triggering events
  console.log('')
  console.log('🧪 Simulating test execution...')
  
  setTimeout(() => {
    socket.emit('simulate-test-run', {
      testPattern: 'tests/realtime-demo.spec.ts',
      executionId: 'demo-' + Date.now()
    })
  }, 2000)
})

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket server')
})

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message)
  process.exit(1)
})

// Keep the script running
setTimeout(() => {
  console.log('⏱️  Test timeout - closing connection')
  socket.disconnect()
  process.exit(0)
}, 30000)
