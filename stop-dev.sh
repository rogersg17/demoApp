#!/bin/bash

# Demo App Development Server Shutdown Script for Linux/macOS
# This script stops both the backend and frontend development servers

echo "🛑 Stopping Demo App Development Servers"
echo ""

# Function to find and kill processes by port
kill_port() {
    local port=$1
    local name=$2
    
    echo "🔍 Looking for processes on port $port ($name)..."
    
    # Find PIDs using the port
    pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🔧 Stopping $name processes (PIDs: $pids)..."
        echo $pids | xargs kill -TERM 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            echo "💥 Force stopping remaining $name processes..."
            echo $remaining_pids | xargs kill -KILL 2>/dev/null
        fi
        
        echo "✅ $name server stopped"
    else
        echo "ℹ️  No $name processes found on port $port"
    fi
}

# Function to kill processes by name pattern
kill_by_name() {
    local pattern=$1
    local name=$2
    
    echo "🔍 Looking for $name processes..."
    
    pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🔧 Stopping $name processes (PIDs: $pids)..."
        echo $pids | xargs kill -TERM 2>/dev/null
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        remaining_pids=$(pgrep -f "$pattern" 2>/dev/null)
        if [ -n "$remaining_pids" ]; then
            echo "💥 Force stopping remaining $name processes..."
            echo $remaining_pids | xargs kill -KILL 2>/dev/null
        fi
        
        echo "✅ $name processes stopped"
    else
        echo "ℹ️  No $name processes found"
    fi
}

# Stop servers by port
kill_port 3000 "Backend"
kill_port 5173 "Frontend"

# Stop any remaining Node.js processes that might be our servers
kill_by_name "ts-node server.ts" "Backend (ts-node)"
kill_by_name "nodemon.*server.ts" "Backend (nodemon)"
kill_by_name "vite.*config" "Frontend (Vite)"

# Stop any npm processes related to dev commands
kill_by_name "npm.*run.*dev" "NPM dev"

# Stop concurrently if it's still running
kill_by_name "concurrently" "Concurrently"

echo ""
echo "✅ Demo App development servers stopped!"
echo ""
echo "ℹ️  Ports 3000 and 5173 should now be available"
echo "ℹ️  You can start development again with: npm run dev:full"
echo ""
