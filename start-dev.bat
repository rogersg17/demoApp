@echo off
REM Demo App Development Startup Script for Windows
REM This script starts both the backend and frontend in development mode

REM Enable UTF-8 encoding for emoji support
chcp 65001 >nul 2>&1

echo.
echo 🚀 Starting Demo App in Development Mode
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root directory.
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found. Creating one with default settings...
    echo PORT=3000 > .env
)

REM Start backend in the background
echo 🔧 Starting backend server on port 3000...
start "Backend Server" cmd /k "chcp 65001 >nul 2>&1 && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Change to frontend directory and start frontend
echo ⚛️  Starting frontend development server on port 5173...
cd frontend

REM Check if frontend dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    call npm install
)

REM Set environment variable for API base URL and start frontend
set VITE_API_BASE_URL=http://localhost:3000
start "Frontend Server" cmd /k "chcp 65001 >nul 2>&1 && npm run dev"

cd ..

echo.
echo ✅ Demo App is starting up!
echo.
echo 📱 Frontend (React): http://localhost:5173
echo 🔧 Backend (API):   http://localhost:3000  
echo 📚 API Docs:        http://localhost:3000/api-docs
echo.
echo ℹ️  Both servers are running in separate windows.
echo ℹ️  Use 'npm run dev:stop:windows' to stop all servers.
echo.
pause
