#!/bin/bash

# Start server with test-friendly rate limits
export LOGIN_RATE_LIMIT_MAX_ATTEMPTS=50
export LOGIN_RATE_LIMIT_WINDOW_MS=60000
export RATE_LIMIT_MAX_REQUESTS=2000
export RATE_LIMIT_WINDOW_MS=60000

echo "🧪 Starting server with test-friendly rate limits..."
echo "📝 Login attempts: $LOGIN_RATE_LIMIT_MAX_ATTEMPTS per $LOGIN_RATE_LIMIT_WINDOW_MS ms"
echo "📝 General requests: $RATE_LIMIT_MAX_REQUESTS per $RATE_LIMIT_WINDOW_MS ms"

npm start
