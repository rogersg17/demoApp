#!/bin/bash

# Demo App Development Startup Script
# This script starts both the backend and frontend in development mode

echo "🚀 Starting Demo App in Development Mode"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating one from template..."
    cp .env.example .env 2>/dev/null || echo "PORT=3000" > .env
fi

# Start backend in the background
echo "🔧 Starting backend server on port 3000..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in new terminal or background
echo "⚛️  Starting frontend development server on port 5173..."
cd frontend

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Set environment variable for API base URL
export VITE_API_BASE_URL=http://localhost:3000

npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Demo App is starting up!"
echo ""
echo "📱 Frontend (React): http://localhost:5173"
echo "🔧 Backend (API):    http://localhost:3000"
echo "📚 API Docs:         http://localhost:3000/api-docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait