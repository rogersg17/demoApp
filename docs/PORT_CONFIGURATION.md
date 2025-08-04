# Port Configuration Guide

This document clarifies the port architecture for the Test Management Platform.

## Port Architecture

### Backend Server (Port 3000)
- **Purpose**: API server, WebSocket server, and legacy interface hosting
- **Runs**: Express.js server with all backend services
- **Command**: `npm start` (from root directory)
- **Access**: http://localhost:3000

### Frontend Development Server (Port 5173)
- **Purpose**: React development server with hot reload
- **Runs**: Vite development server for the React frontend
- **Command**: `cd frontend && npm run dev`
- **Access**: http://localhost:5173

## Development Workflow

1. **Start Backend**: Run `npm start` from the root directory (port 3000)
2. **Start Frontend**: Run `cd frontend && npm run dev` (port 5173)
3. **Access App**: Use http://localhost:5173 for React development
4. **API Calls**: Frontend automatically proxies to backend via Vite configuration

## Configuration

### Frontend Proxy Configuration
The frontend (`frontend/vite.config.ts`) proxies API calls to the backend:
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

### Environment Variables
- `VITE_API_BASE_URL`: Backend server URL (defaults to http://localhost:3000)
- Frontend server port is configured in `vite.config.ts` (5173)

## Production Deployment
In production, the React app builds to static files served by the backend server on port 3000.
