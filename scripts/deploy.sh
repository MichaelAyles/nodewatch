#!/bin/bash

# NodeWatch Docker Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.docker.local"
PROJECT_NAME="nodewatch"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "All requirements met"
}

setup_environment() {
    log_info "Setting up environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file $ENV_FILE not found. Creating from template..."
        cp .env.docker "$ENV_FILE"
        
        log_warning "Please edit $ENV_FILE and add your API keys and passwords:"
        log_warning "  - POSTGRES_PASSWORD"
        log_warning "  - OPENAI_API_KEY"
        log_warning "  - ANTHROPIC_API_KEY (optional)"
        
        read -p "Press Enter after you've configured the environment file..."
    fi
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    log_success "Environment configured"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build TypeScript first
    log_info "Building TypeScript..."
    npm run build
    
    # Build Docker images
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    log_success "Images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Create networks and volumes
    docker-compose -f "$COMPOSE_FILE" up --no-start
    
    # Start database first
    log_info "Starting database..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" --profile migrate up migrate
    
    # Start API and workers
    log_info "Starting API server and workers..."
    docker-compose -f "$COMPOSE_FILE" up -d api worker
    
    # Start nginx
    log_info "Starting reverse proxy..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx
    
    log_success "All services deployed"
}

check_health() {
    log_info "Checking service health..."
    
    # Wait a bit for services to start
    sleep 15
    
    # Check API health
    if curl -f http://localhost/health &> /dev/null; then
        log_success "API server is healthy"
    else
        log_error "API server health check failed"
        return 1
    fi
    
    # Check database
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U nodewatch &> /dev/null; then
        log_success "Database is healthy"
    else
        log_error "Database health check failed"
        return 1
    fi
    
    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q PONG; then
        log_success "Redis is healthy"
    else
        log_error "Redis health check failed"
        return 1
    fi
    
    log_success "All services are healthy"
}

show_status() {
    log_info "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Access URLs:"
    echo "  🌐 Web Interface: http://localhost"
    echo "  📊 API Health: http://localhost/health"
    echo "  📈 Queue Stats: http://localhost/api/queue/stats"
    
    if docker-compose -f "$COMPOSE_FILE" --profile monitoring ps | grep -q grafana; then
        echo "  📊 Grafana: http://localhost:3001 (admin/admin)"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" --profile admin ps | grep -q pgadmin; then
        echo "  🗄️  PgAdmin: http://localhost:8080"
    fi
}

# Main deployment flow
main() {
    log_info "Starting NodeWatch deployment..."
    
    check_requirements
    setup_environment
    build_images
    deploy_services
    check_health
    show_status
    
    log_success "🎉 NodeWatch deployed successfully!"
    log_info "You can now access the application at http://localhost"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f "$COMPOSE_FILE" down
        log_success "All services stopped"
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        log_success "Services restarted"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "status")
        show_status
        ;;
    "clean")
        log_warning "This will remove all containers, volumes, and images!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f "$COMPOSE_FILE" down -v --rmi all
            log_success "Cleanup complete"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy all services (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs (optionally specify service name)"
        echo "  status   - Show service status and URLs"
        echo "  clean    - Remove all containers, volumes, and images"
        exit 1
        ;;
esac