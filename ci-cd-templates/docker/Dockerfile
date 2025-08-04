# TMS Test Runner Container
# Based on official Playwright image with additional TMS integration tools
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js LTS (if not already available)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Install Playwright browsers (already included in base image, but ensure latest)
RUN npx playwright install --with-deps

# Copy TMS integration scripts
COPY docker/scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh

# Copy test source code
COPY . .

# Create directories for test results and reports
RUN mkdir -p /app/test-results /app/test-reports /app/artifacts

# Set environment variables
ENV NODE_ENV=test
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV TEST_RESULTS_DIR=/app/test-results
ENV TEST_REPORTS_DIR=/app/test-reports
ENV ARTIFACTS_DIR=/app/artifacts

# Create non-root user for security
RUN groupadd -r tmsuser && useradd -r -g tmsuser -G audio,video tmsuser \
    && mkdir -p /home/tmsuser/Downloads \
    && chown -R tmsuser:tmsuser /app /home/tmsuser

# Switch to non-root user
USER tmsuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && npx playwright --version || exit 1

# Default command - can be overridden
CMD ["tms-test-runner.sh"]