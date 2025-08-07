@echo off
REM Demo App Development Server Shutdown Script for Windows
REM This script stops both the backend and frontend development servers

REM Enable UTF-8 encoding for emoji support
chcp 65001 >nul 2>&1

echo.
echo 🛑 Stopping Demo App Development Servers
echo.

REM Function to kill processes by name
echo 🔍 Looking for Node.js processes...

REM Kill all node processes (this will stop both backend and frontend)
tasklist | findstr /i "node.exe" > nul
if %errorlevel% equ 0 (
    echo 🔧 Stopping backend server processes...
    taskkill /F /IM node.exe /T > nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Backend server processes stopped
    ) else (
        echo ⚠️  No backend processes found or already stopped
    )
) else (
    echo ℹ️  No Node.js processes found
)

REM Also try to kill any remaining npm processes
tasklist | findstr /i "npm.cmd" > nul
if %errorlevel% equ 0 (
    echo 🔧 Stopping npm processes...
    taskkill /F /IM npm.cmd /T > nul 2>&1
    echo ✅ npm processes stopped
)

REM Kill any cmd windows with our server titles
echo 🔧 Closing server windows...
for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq Backend Server*" /FO CSV /NH 2^>nul ^| findstr /V "INFO:"') do (
    if "%%a" neq "" (
        taskkill /F /PID %%a > nul 2>&1
        echo ✅ Backend server window closed
    )
)

for /f "tokens=2" %%a in ('tasklist /FI "WINDOWTITLE eq Frontend Server*" /FO CSV /NH 2^>nul ^| findstr /V "INFO:"') do (
    if "%%a" neq "" (
        taskkill /F /PID %%a > nul 2>&1
        echo ✅ Frontend server window closed
    )
)

REM Check ports and kill any remaining processes
echo 🔍 Checking ports 3000 and 5173...

REM Kill processes using port 3000 (backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    if "%%a" neq "" (
        echo 🔧 Stopping process on port 3000 (PID: %%a)
        taskkill /F /PID %%a > nul 2>&1
    )
)

REM Kill processes using port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    if "%%a" neq "" (
        echo 🔧 Stopping process on port 5173 (PID: %%a)
        taskkill /F /PID %%a > nul 2>&1
    )
)

echo.
echo ✅ Demo App development servers stopped!
echo.
echo ℹ️  Ports 3000 and 5173 should now be available
echo ℹ️  You can start development again with: npm run dev:full
echo.
pause
