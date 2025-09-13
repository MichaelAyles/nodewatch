# Multi-stage build for NodeWatch
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY convex/ ./convex/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    docker-cli \
    curl \
    ca-certificates

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodewatch -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodewatch:nodejs /app/dist ./dist
COPY --from=builder --chown=nodewatch:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodewatch:nodejs /app/package.json ./

# Create cache directory
RUN mkdir -p /app/cache && chown nodewatch:nodejs /app/cache

# Switch to non-root user
USER nodewatch

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]