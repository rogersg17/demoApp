@echo off
REM Demo App Development Startup Script for Windows (Enhanced Emoji Version)
REM This script starts both the backend and frontend in development mode

REM Try to enable UTF-8 encoding for emoji support
chcp 65001 >nul 2>&1

REM Test if emojis work, fallback to ASCII if not
echo 🚀 >nul 2>&1
if %errorlevel% neq 0 (
    set EMOJI_MODE=false
) else (
    set EMOJI_MODE=true
)

echo.
if "%EMOJI_MODE%"=="true" (
    echo 🚀 Starting Demo App in Development Mode
) else (
    echo [START] Starting Demo App in Development Mode
)
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    if "%EMOJI_MODE%"=="true" (
        echo ❌ Error: package.json not found. Please run this script from the project root directory.
    ) else (
        echo [ERROR] package.json not found. Please run this script from the project root directory.
    )
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    if "%EMOJI_MODE%"=="true" (
        echo ⚠️  No .env file found. Creating one with default settings...
    ) else (
        echo [WARN] No .env file found. Creating one with default settings...
    )
    echo PORT=3000 > .env
)

REM Start backend in the background
if "%EMOJI_MODE%"=="true" (
    echo 🔧 Starting backend server on port 3000...
    start "Backend Server" cmd /k "chcp 65001 >nul 2>&1 && npm run dev"
) else (
    echo [START] Starting backend server on port 3000...
    start "Backend Server" cmd /k "npm run dev"
)

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Change to frontend directory and start frontend
if "%EMOJI_MODE%"=="true" (
    echo ⚛️  Starting frontend development server on port 5173...
) else (
    echo [START] Starting frontend development server on port 5173...
)
cd frontend

REM Check if frontend dependencies are installed
if not exist "node_modules" (
    if "%EMOJI_MODE%"=="true" (
        echo 📦 Installing frontend dependencies...
    ) else (
        echo [INSTALL] Installing frontend dependencies...
    )
    call npm install
)

REM Set environment variable for API base URL and start frontend
set VITE_API_BASE_URL=http://localhost:3000
if "%EMOJI_MODE%"=="true" (
    start "Frontend Server" cmd /k "chcp 65001 >nul 2>&1 && npm run dev"
) else (
    start "Frontend Server" cmd /k "npm run dev"
)

cd ..

echo.
if "%EMOJI_MODE%"=="true" (
    echo ✅ Demo App is starting up!
    echo.
    echo 📱 Frontend (React): http://localhost:5173
    echo 🔧 Backend (API):   http://localhost:3000  
    echo 📚 API Docs:        http://localhost:3000/api-docs
    echo.
    echo ℹ️  Both servers are running in separate windows.
    echo ℹ️  Use 'npm run dev:stop:windows' to stop all servers.
) else (
    echo [SUCCESS] Demo App is starting up!
    echo.
    echo [ACCESS] Frontend (React): http://localhost:5173
    echo [ACCESS] Backend (API):   http://localhost:3000  
    echo [ACCESS] API Docs:        http://localhost:3000/api-docs
    echo.
    echo [INFO] Both servers are running in separate windows.
    echo [INFO] Use 'npm run dev:stop:windows' to stop all servers.
)
echo.
pause
