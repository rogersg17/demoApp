# Demo App Startup Guide

This guide explains how to start the Demo App with its React frontend and Node.js backend.

## Architecture Overview

- **Backend**: Node.js + Express server running on port 3000
- **Frontend**: React development server running on port 5173
- **Communication**: Frontend proxies API calls to backend via Vite proxy

## Quick Start (Recommended)

### Option 1: Single Command Startup
```bash
npm run dev:full
```
This script starts both backend and frontend simultaneously.

### Option 2: Manual Startup
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev
```

## Environment Configuration

The app uses environment variables for configuration:

### Backend (.env)
```bash
PORT=3000                           # Backend server port
CORS_ORIGINS=http://localhost:5173  # Allow frontend to connect
```

### Frontend (automatic)
The frontend automatically connects to `http://localhost:3000` for API calls through the Vite proxy configuration.

## Access URLs

Once started, access the application at:

- **Frontend (React App)**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/*
- **API Documentation**: http://localhost:3000/api-docs

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 3000 | Node.js server, API endpoints, WebSocket |
| Frontend Dev | 5173 | Vite development server with HMR |

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### Environment Issues
- Ensure `.env` file exists in root directory
- Frontend automatically uses `VITE_API_BASE_URL=http://localhost:3000`

### Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

## Production Deployment

For production, the frontend is built and served by the backend:

```bash
npm run build:production
npm start
```

This serves everything on port 3000.