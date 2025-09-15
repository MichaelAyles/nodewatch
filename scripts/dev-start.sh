#!/bin/bash

# NodeWatch Development Startup Script
# This script starts all required services for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval $check_command >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $max_attempts seconds"
    return 1
}

# Function to cleanup on exit
cleanup() {
    print_warning "Shutting down services..."
    
    # Kill background processes
    if [ ! -z "$REDIS_PID" ]; then
        print_status "Stopping Redis..."
        docker stop nodewatch-redis >/dev/null 2>&1 || true
        docker rm nodewatch-redis >/dev/null 2>&1 || true
    fi
    
    if [ ! -z "$CONVEX_PID" ]; then
        print_status "Stopping Convex..."
        kill $CONVEX_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$API_PID" ]; then
        print_status "Stopping API server..."
        kill $API_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$WORKER_PID" ]; then
        print_status "Stopping worker..."
        kill $WORKER_PID 2>/dev/null || true
    fi
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_success "🚀 Starting NodeWatch Development Environment"
echo

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists docker; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command_exists npx; then
    print_error "npx is not available"
    exit 1
fi

print_success "All prerequisites found"

# Check if ports are available
print_status "Checking port availability..."

if port_in_use 3000; then
    print_error "Port 3000 is already in use (API server)"
    exit 1
fi

if port_in_use 6379; then
    print_warning "Port 6379 is in use, checking if it's our Redis..."
    if docker ps | grep -q nodewatch-redis; then
        print_status "Found existing NodeWatch Redis container"
    else
        print_error "Port 6379 is in use by another service"
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Start Redis
print_status "Starting Redis..."
if ! docker ps | grep -q nodewatch-redis; then
    docker run -d \
        --name nodewatch-redis \
        -p 6379:6379 \
        redis:7-alpine \
        redis-server --appendonly yes --maxmemory 256mb >/dev/null
    
    wait_for_service "Redis" "docker exec nodewatch-redis redis-cli ping"
    REDIS_PID="docker"
else
    print_success "Redis is already running"
fi

# Start Convex
print_status "Starting Convex..."
if ! pgrep -f "convex dev" >/dev/null; then
    npx convex dev > logs/convex.log 2>&1 &
    CONVEX_PID=$!
    
    # Wait for Convex to be ready (check for the URL in logs)
    wait_for_service "Convex" "grep -q 'Convex functions ready' logs/convex.log"
else
    print_success "Convex is already running"
fi

# Create logs directory
mkdir -p logs

# Start API server
print_status "Starting API server..."
npm run dev > logs/api.log 2>&1 &
API_PID=$!

wait_for_service "API server" "curl -f http://localhost:3000/health"

# Start worker
print_status "Starting analysis worker..."
npm run worker:dev > logs/worker.log 2>&1 &
WORKER_PID=$!

# Give worker a moment to start
sleep 3

print_success "🎉 All services started successfully!"
echo
print_status "Services running:"
echo "  📡 API Server:      http://localhost:3000"
echo "  🔧 Admin Dashboard: http://localhost:3000/admin"
echo "  📊 Redis:           localhost:6379"
echo "  🗄️  Convex:          Check logs/convex.log for URL"
echo
print_status "Logs available in:"
echo "  📝 API Server:      logs/api.log"
echo "  👷 Worker:          logs/worker.log"
echo "  🗄️  Convex:          logs/convex.log"
echo
print_status "Admin Dashboard Login:"
echo "  👤 Username: admin"
echo "  🔑 Password: nodewatch-admin-2024"
echo
print_warning "Press Ctrl+C to stop all services"

# Keep script running and show live logs
echo
print_status "Live API server logs (Ctrl+C to stop):"
echo "----------------------------------------"

# Follow API logs
tail -f logs/api.log