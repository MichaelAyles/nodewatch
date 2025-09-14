# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NodeWatch is a comprehensive system for evaluating npm packages for malware detection. The system analyzes npm packages using static analysis, dynamic sandboxing, and LLM-powered code review to provide safety scores and identify potentially malicious code.

## Architecture

The system follows a **persistent backend service architecture** with clear separation of concerns:

### Service Layers
1. **API Gateway Layer**: Express server handles job submission and status queries (non-blocking)
2. **Job Queue Layer**: BullMQ manages analysis jobs with Redis backend
3. **Worker Service Layer**: Persistent background workers process analysis jobs
4. **Analysis Pipeline**: Multi-stage analysis within worker processes
5. **Caching Layer**: Multi-tier caching with content deduplication
6. **Data Layer**: Convex database for real-time data storage

### Analysis Pipeline (Within Workers)
1. **Content Deduplication**: SHA-256 based caching to avoid redundant analysis
2. **Enhanced Static Analysis**: 40+ patterns, obfuscation detection, typosquatting analysis
3. **Dynamic Sandbox Analysis**: Docker containers monitor package behavior
4. **LLM Analysis**: AI-powered code review for suspicious patterns (cost-optimized)
5. **Risk Scoring**: Weighted signal combination with confidence scoring

## Key Components

- **Backend API**: Node.js/Express service handling package analysis requests
- **Worker Nodes**: Process analysis jobs from queue (BullMQ/Redis)
- **Database**: PostgreSQL for package metadata, analysis results, and content storage
- **Cache Layer**: Redis for job queuing and result caching
- **Sandbox Environment**: Docker/Firecracker containers for safe package execution
- **Frontend**: React/Vue application with package search and dependency visualization

## Development Commands

The system requires both API server and worker processes:

```bash
# Install dependencies
npm install

# Development (requires 2 terminals)
npm run dev         # Terminal 1: API server with hot reload
npm run worker:dev  # Terminal 2: Worker service with hot reload

# Production
npm run start       # API server
npm run worker      # Worker service (background)

# Testing & Building
npm test           # Run comprehensive test suite (58 tests)
npm run build      # Compile TypeScript

# Docker (full stack)
npm run docker:build  # Build images
npm run docker:run    # Start API + Workers + Redis
```

## Service Architecture

### API Server (`npm run dev`)
- **Purpose**: Job management, status queries, result retrieval
- **Port**: 3000 (configurable)
- **Responsibilities**: 
  - Queue analysis jobs (non-blocking)
  - Provide job status and progress updates
  - Serve web interface
  - Manage queue statistics

### Worker Service (`npm run worker:dev`)  
- **Purpose**: Background analysis processing
- **Scaling**: Multiple workers can run in parallel
- **Responsibilities**:
  - Process analysis jobs from queue
  - Execute multi-stage analysis pipeline
  - Update job progress in real-time
  - Store results in database and cache

## Database Schema Considerations

When implementing the database, ensure these key tables:
- `packages`: NPM package metadata
- `versions`: Package version information
- `contents`: Deduplicated file contents (SHA-256 indexed)
- `analysis_results`: Results from each analysis stage
- `dependencies`: Package dependency relationships
- `scores`: Final risk scores and reasoning

## Analysis Pipeline Implementation

When implementing analysis stages:

1. **Static Analysis**: Integrate Semgrep with custom rules for npm-specific patterns (eval usage, network calls, filesystem access, obfuscation patterns)
2. **Dynamic Analysis**: Monitor syscalls, network activity, file operations, and resource usage in sandboxed environments
3. **LLM Analysis**: Only send pre-filtered suspicious code segments to reduce costs. Include context about why code was flagged.

## API Design Principles

- RESTful endpoints for package queries
- Webhook support for analysis completion notifications
- Rate limiting for public API access
- Batch processing support for efficiency

## Performance Considerations

- Content-based deduplication is critical - many packages share common dependencies
- Use streaming for large package downloads
- Implement intelligent caching at multiple levels
- Queue prioritization based on package popularity/criticality

## Security Requirements

- All package execution must occur in isolated sandbox environments
- Never execute untrusted code outside containers
- Implement resource limits for analysis jobs
- Log all analysis activities for audit purposes

## Testing Strategy

- Unit tests for individual analysis modules
- Integration tests for pipeline stages
- End-to-end tests with known malicious packages
- Performance tests for scaling validation