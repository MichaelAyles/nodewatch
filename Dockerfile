FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# Build frontend
RUN npx webpack --mode=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/metrics || exit 1

# Run migration then start API server
CMD ["sh", "-c", "npx tsx src/database/migrate.ts && npx tsx src/index.ts"]
