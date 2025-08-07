# Cross-Platform Development Guide

This guide explains how to run the Test Management Platform in development mode on Windows, Linux, and macOS.

## Quick Start

### Prerequisites
- Node.js 18+
- npm package manager
- Git

### One-Command Development

The simplest way to start development on any platform:

```bash
npm run dev:full
```

To stop development servers:

```bash
npm run dev:stop
```

**Start command automatically:**
- ✅ Starts backend server on port 3000 with hot reload
- ✅ Starts frontend server on port 5173 with hot reload  
- ✅ Sets up proper environment variables
- ✅ Displays colored logs for easy debugging
- ✅ Kills both servers if one fails

**Stop command automatically:**
- ✅ Finds and stops processes on ports 3000 and 5173
- ✅ Stops Node.js, npm, and related development processes
- ✅ Works across Windows, Linux, and macOS
- ✅ Provides detailed feedback on what was stopped

## Platform-Specific Details

### Windows

The `dev:full` command works natively on Windows using PowerShell or Command Prompt.

**Alternative Windows approach** (opens separate command windows):
```cmd
npm run dev:full:windows
npm run dev:stop:windows
```

This runs `start-dev.bat` and `stop-dev.bat` which:
- Opens backend in one command window
- Opens frontend in another command window  
- Allows you to see logs separately
- Keeps servers running even if you close the original terminal
- Provides dedicated stop script to close all server windows

### Linux & macOS

The `dev:full` command works natively using the `concurrently` package.

**Alternative Unix approach** (uses bash script):
```bash
npm run dev:full:linux
npm run dev:stop:linux
```

This runs `start-dev.sh` and `stop-dev.sh` which:
- Starts servers with bash process management
- Provides colored output and status messages
- Handles cleanup on Ctrl+C
- Includes dedicated stop script for manual shutdown

## Individual Services

If you need to run services separately:

```bash
# Backend only (TypeScript with hot reload)
npm run dev

# Frontend only (React with Vite)
npm run dev:frontend

# Production mode (compiled JavaScript)
npm start
```

## Development Workflow

### Typical Development Session

1. **Start development environment:**
   ```bash
   npm run dev:full
   ```

2. **Access the applications:**
   - Frontend (React): http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

3. **Make changes:**
   - Backend changes: Edit TypeScript files, nodemon auto-restarts
   - Frontend changes: Edit React components, Vite hot-reloads instantly

4. **Stop development:**
   ```bash
   # Graceful stop (recommended)
   npm run dev:stop
   
   # Alternative: Press Ctrl+C in the terminal (for concurrently)
   # Alternative: Close command windows (for Windows batch script)
   ```

### Stopping Development Servers

The platform includes multiple ways to stop development servers:

#### Cross-Platform Stop (Recommended)
```bash
npm run dev:stop
```
- Works on Windows, Linux, and macOS
- Automatically finds processes on ports 3000 and 5173
- Stops Node.js, npm, and related development processes
- Provides detailed feedback

#### Platform-Specific Stop
```bash
# Windows batch script
npm run dev:stop:windows

# Linux/macOS shell script  
npm run dev:stop:linux
```

#### Manual Stop Methods
- **Concurrently**: Press `Ctrl+C` in the terminal where `npm run dev:full` is running
- **Windows separate windows**: Close both "Backend Server" and "Frontend Server" command windows
- **Process kill**: Use Task Manager (Windows) or Activity Monitor (macOS) to kill Node.js processes

### Environment Variables

The development setup automatically configures:

```bash
# Frontend connects to backend
VITE_API_BASE_URL=http://localhost:3000

# Backend port (configurable)
PORT=3000
```

Custom environment variables can be set in `.env` files:
- `.env` - Main environment configuration
- `.env.local` - Local overrides (not committed to git)

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Use the built-in stop script (recommended)
npm run dev:stop

# Or manually check what's running on ports
netstat -ano | findstr :3000  # Windows
lsof -ti:3000                 # Linux/macOS

# Manual kill processes on port (if stop script doesn't work)
taskkill /F /PID <PID>        # Windows  
kill -9 <PID>                 # Linux/macOS
```

**Dependencies not installed:**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

**TypeScript compilation errors:**
```bash
# Check TypeScript compilation
npm run type-check

# Build TypeScript
npm run build
```

### Development Tools

**Recommended VS Code Extensions:**
- TypeScript & JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Playwright Test Runner
- REST Client (for API testing)

**Database Tools:**
```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (development only)
npm run db:reset
```

## Advanced Development

### Testing During Development

```bash
# Run E2E tests (requires both servers running)
npm run test:e2e

# Run tests with UI (interactive mode)  
npm run test:e2e:ui

# Run API tests
npm run test:api
```

### Docker Development

```bash
# Build and start with Docker
npm run deploy

# View logs
npm run deploy:logs

# Stop containers
npm run deploy:stop
```

## Architecture Notes

The development setup reflects the dual-server architecture:

- **Backend** (`server.ts`): Express.js API server with TypeScript, WebSocket support
- **Frontend** (`frontend/`): React with Vite, connects to backend via HTTP/WebSocket

This separation allows:
- Independent deployment of frontend and backend
- Different scaling strategies for each service
- Clear separation of concerns between UI and business logic

## Next Steps

After setting up development:

1. Review the [Architecture Overview](architecture/README.md)
2. Check the [API Documentation](../README.md#-api-reference)
3. Run the test suite to verify everything works
4. Start with the [MVP Implementation Plan](architecture/ADR-001-MVP-IMPLEMENTATION-PLAN.md)
