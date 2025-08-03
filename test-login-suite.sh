#!/bin/bash

echo "🧪 Starting comprehensive login test suite..."

# Function to cleanup processes on exit
cleanup() {
    echo "🧹 Cleaning up processes..."
    pkill -f "vite" 2>/dev/null
    pkill -f "node.*server.js" 2>/dev/null
    exit 0
}

# Setup cleanup trap
trap cleanup EXIT INT TERM

# Start backend server with test-friendly rate limits
echo "🚀 Starting backend server with test-friendly rate limits..."
PORT=3000 LOGIN_RATE_LIMIT_MAX_ATTEMPTS=50 LOGIN_RATE_LIMIT_WINDOW_MS=60000 RATE_LIMIT_MAX_REQUESTS=2000 RATE_LIMIT_WINDOW_MS=60000 npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend server to start..."
sleep 5

# Start frontend server
echo "🎨 Starting frontend server..."
cd frontend
VITE_API_BASE_URL=http://localhost:3000 npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend server to start..."
sleep 5

# Run the login tests
echo "🧪 Running login functional tests..."
VITE_API_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/login-functional.spec.ts --reporter=line

# Get test result
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All login tests passed!"
else
    echo "❌ Some login tests failed!"
fi

# Cleanup will happen via trap
exit $TEST_RESULT
