# Docker Deployment Guide

This guide covers deploying NodeWatch using Docker containers on a single server.

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

### 1. Clone and Setup
```bash
git clone https://github.com/yourusername/nodewatch.git
cd nodewatch
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.docker .env.docker.local

# Edit with your values
nano .env.docker.local
```

Required environment variables:
```bash
POSTGRES_PASSWORD=your_secure_password_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional
```

### 3. Deploy
```bash
# One-command deployment
./scripts/deploy.sh

# Or step by step
npm run build
npm run docker:prod
```

### 4. Access
- **Web Interface**: http://localhost
- **API Health**: http://localhost/health
- **Queue Stats**: http://localhost/api/queue/stats

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Single Docker Host                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │  Nginx  │  │   API   │  │Worker 1 │  │Worker 2 │   │
│  │  :80    │  │  :3000  │  │Background│  │Background│   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
│       │            │            │            │        │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐ │
│  │  Redis  │  │Postgres │  │      Docker Network     │ │
│  │  :6379  │  │  :5432  │  │     (Internal Only)     │ │
│  └─────────┘  └─────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📋 Services

| Service | Purpose | Ports | Resources |
|---------|---------|-------|-----------|
| **nginx** | Reverse proxy, static files | 80, 443 | 50MB RAM |
| **api** | Job management, REST API | 3000 | 200MB RAM |
| **worker** | Background analysis (2x) | - | 500MB RAM each |
| **postgres** | Database | 5432 | 300MB RAM |
| **redis** | Cache, job queue | 6379 | 100MB RAM |

## 🛠️ Management Commands

### Basic Operations
```bash
# Deploy/start all services
./scripts/deploy.sh

# Stop all services
./scripts/deploy.sh stop

# Restart services
./scripts/deploy.sh restart

# View logs
./scripts/deploy.sh logs
./scripts/deploy.sh logs api     # Specific service
./scripts/deploy.sh logs worker  # Worker logs

# Check status
./scripts/deploy.sh status
```

### Development Mode
```bash
# Start with hot reload and debug ports
npm run docker:dev

# Access development tools
# - PgAdmin: http://localhost:8080 (admin@nodewatch.dev / admin)
# - Redis Commander: http://localhost:8081
```

### Scaling Workers
```bash
# Scale workers dynamically
docker-compose up -d --scale worker=5

# Check resource usage
docker stats
```

### Monitoring (Optional)
```bash
# Start with monitoring stack
docker-compose --profile monitoring up -d

# Access monitoring
# - Grafana: http://localhost:3001 (admin / admin)
# - Prometheus: http://localhost:9090
```

## 🔧 Configuration

### Environment Variables
```bash
# Application
NODE_ENV=production
LOG_LEVEL=info
MAX_CONCURRENT_ANALYSES=3

# Database
POSTGRES_PASSWORD=secure_password

# APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
JWT_SECRET=random_secret
WEBHOOK_SECRET=webhook_secret
```

### Resource Limits
Edit `docker-compose.yml` to adjust resource limits:
```yaml
services:
  worker:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### SSL/HTTPS Setup
1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update `nginx/nginx.conf` with SSL configuration
3. Mount certificates in docker-compose.yml

## 📊 Monitoring

### Health Checks
```bash
# API health
curl http://localhost/health

# Database health
docker-compose exec postgres pg_isready -U nodewatch

# Redis health
docker-compose exec redis redis-cli ping
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker

# Follow new logs only
docker-compose logs -f --tail=0
```

### Metrics
```bash
# Queue statistics
curl http://localhost/api/queue/stats

# Service status
docker-compose ps

# Resource usage
docker stats
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
./scripts/deploy.sh logs

# Check Docker daemon
docker info

# Check ports
netstat -tulpn | grep :80
```

#### Database Connection Issues
```bash
# Check database health
docker-compose exec postgres pg_isready -U nodewatch

# Reset database
docker-compose down -v
./scripts/deploy.sh
```

#### High Memory Usage
```bash
# Check resource usage
docker stats

# Scale down workers
docker-compose up -d --scale worker=1

# Restart services
docker-compose restart
```

#### Analysis Jobs Stuck
```bash
# Check Redis queue
docker-compose exec redis redis-cli
> LLEN analysis-queue

# Restart workers
docker-compose restart worker
```

### Performance Tuning

#### For High Load
```yaml
# Increase worker count
services:
  worker:
    deploy:
      replicas: 5

# Increase Redis memory
services:
  redis:
    command: redis-server --maxmemory 1gb
```

#### For Low Resources
```yaml
# Reduce worker count
services:
  worker:
    deploy:
      replicas: 1
    environment:
      - MAX_CONCURRENT_ANALYSES=1
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U nodewatch nodewatch > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U nodewatch nodewatch < backup.sql
```

### Full System Backup
```bash
# Stop services
./scripts/deploy.sh stop

# Backup volumes
docker run --rm -v nodewatch_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .
docker run --rm -v nodewatch_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Restart services
./scripts/deploy.sh
```

## 🚀 Production Deployment

### Server Requirements
- **Minimum**: 4 CPU cores, 8GB RAM, 50GB SSD
- **Recommended**: 8 CPU cores, 16GB RAM, 100GB SSD
- **Network**: 1Gbps connection for npm downloads

### Security Checklist
- [ ] Change default passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable log rotation
- [ ] Configure automated backups
- [ ] Set up monitoring alerts
- [ ] Review and harden nginx configuration

### Cost Estimation
- **VPS (Hetzner/DigitalOcean)**: $40-80/month
- **OpenAI API**: $50-200/month (depending on usage)
- **Total**: $90-280/month for production workload

This Docker setup gives you a complete, production-ready npm malware detection system running on a single server! 🎉