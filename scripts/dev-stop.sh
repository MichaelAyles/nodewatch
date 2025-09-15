#!/bin/bash

# NodeWatch Development Stop Script
# This script stops all development services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[NodeWatch]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[NodeWatch]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[NodeWatch]${NC} $1"
}

print_error() {
    echo -e "${RED}[NodeWatch]${NC} $1"
}

print_warning "🛑 Stopping NodeWatch Development Environment"

# Stop Redis container
print_status "Stopping Redis..."
if docker ps | grep -q nodewatch-redis; then
    docker stop nodewatch-redis >/dev/null 2>&1
    docker rm nodewatch-redis >/dev/null 2>&1
    print_success "Redis stopped"
else
    print_status "Redis was not running"
fi

# Stop Convex
print_status "Stopping Convex..."
if pgrep -f "convex dev" >/dev/null; then
    pkill -f "convex dev"
    print_success "Convex stopped"
else
    print_status "Convex was not running"
fi

# Stop API server
print_status "Stopping API server..."
if pgrep -f "tsx watch src/index.ts" >/dev/null; then
    pkill -f "tsx watch src/index.ts"
    print_success "API server stopped"
else
    print_status "API server was not running"
fi

# Stop worker
print_status "Stopping worker..."
if pgrep -f "tsx watch src/worker.ts" >/dev/null; then
    pkill -f "tsx watch src/worker.ts"
    print_success "Worker stopped"
else
    print_status "Worker was not running"
fi

# Clean up any remaining tsx processes
print_status "Cleaning up remaining processes..."
pkill -f "tsx" 2>/dev/null || true

print_success "🎉 All services stopped successfully!"