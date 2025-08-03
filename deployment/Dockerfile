# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    dumb-init

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production

# Copy application source
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/backups

# Create non-root user
RUN addgroup -g 1001 -S tms && \
    adduser -S tms -u 1001 -G tms

# Set permissions
RUN chown -R tms:tms /app

# Switch to non-root user
USER tms

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
