# NodeWatch Development Scripts

This directory contains scripts to easily start and manage NodeWatch development services.

## Quick Start (Recommended)

### If Docker is Running:
```bash
# One command to start everything with Docker
npm run dev:all
```

### If Docker is NOT Available:
```bash
# Start with local Redis (requires Redis installed)
npm run dev:no-docker
```

### Background Mode:
```bash
# Start everything in background (requires Docker)
npm run dev:quick
```

## Manual Control

```bash
# Start individual services
npm run dev:redis    # Start Redis only
npm run dev:convex   # Start Convex only
npm run dev         # Start API server only
npm run worker:dev   # Start worker only

# Stop all services
npm run dev:stop
```

## Available Scripts

### `npm run dev:all` (Recommended)
- **Best for**: Most users with Docker
- **What it does**: Starts all services including Redis in Docker
- **Requirements**: Docker running
- **Logs**: Services run in background, check logs/ directory
- **Stop**: `npm run dev:stop`

### `npm run dev:no-docker`
- **Best for**: Users without Docker or prefer local Redis
- **What it does**: Starts all services using local Redis
- **Requirements**: Redis installed locally (brew install redis)
- **Logs**: Services run in background, check logs/ directory
- **Stop**: `npm run dev:stop`

### `npm run dev:quick`
- **Best for**: Quick testing (legacy)
- **What it does**: Starts all services in background, exits immediately
- **Requirements**: Docker
- **Stop**: `npm run dev:stop`

### `npm run dev:shell` (Linux/Mac only)
- **Best for**: Advanced users who want shell script control
- **What it does**: Same as `dev:all` but using bash script
- **Requirements**: bash, Linux/Mac

## Services Started

All scripts start these services:

1. **Redis** (Docker container)
   - Port: 6379
   - Container name: `nodewatch-redis`
   - Used for: Job queue and caching

2. **Convex** (Database)
   - Development database
   - Auto-syncs schema changes
   - Check logs for connection URL

3. **API Server** (Express)
   - Port: 3000
   - Hot reload enabled
   - Serves web interface and REST API

4. **Analysis Worker** (Background processor)
   - Processes analysis jobs from queue
   - Hot reload enabled
   - Handles package analysis

## Access Points

Once started, you can access:

- **Web Interface**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API Health**: http://localhost:3000/health
- **Queue Stats**: http://localhost:3000/api/queue/stats

### Admin Dashboard Login
- Username: `admin`
- Password: `nodewatch-admin-2024`

## Logs

Logs are stored in the `logs/` directory:

```bash
# View all logs
npm run logs

# View specific logs
tail -f logs/api.log      # API server
tail -f logs/worker.log   # Analysis worker  
tail -f logs/convex.log   # Convex database
```

## Troubleshooting

### Port Already in Use
If you get port errors:
```bash
# Check what's using port 3000
lsof -i :3000

# Stop all NodeWatch services
npm run dev:stop
```

### Redis Issues
```bash
# Remove Redis container and restart
docker stop nodewatch-redis
docker rm nodewatch-redis
npm run dev:redis
```

### Clean Restart
```bash
# Stop everything and clean up
npm run dev:stop
docker stop nodewatch-redis && docker rm nodewatch-redis
pkill -f "tsx"
pkill -f "convex"

# Start fresh
npm run dev:quick
```

## Prerequisites

Make sure you have installed:
- Node.js 18+
- npm
- Docker
- All project dependencies (`npm install`)

## Environment

The scripts use your `.env.local` file automatically. Make sure it's configured with:
- Convex credentials
- OpenRouter API key (optional)
- Other configuration as needed