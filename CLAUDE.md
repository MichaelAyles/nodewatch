# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NodeWatch is a comprehensive system for evaluating npm packages for malware detection. The system analyzes npm packages using static analysis, dynamic sandboxing, and LLM-powered code review to provide safety scores and identify potentially malicious code.

## Architecture

The system follows a multi-stage pipeline architecture:

1. **Ingestion Pipeline**: Fetches packages from npm registry, extracts tarballs, and stores content with SHA-256 based deduplication
2. **Static Analysis Stage**: Fast filtering using Semgrep rules, pattern matching, and heuristic analysis
3. **Dynamic Analysis Stage**: Sandbox execution in containerized environments to monitor behavior
4. **LLM Analysis Stage**: AI-powered code review for suspicious patterns, focused only on pre-filtered suspicious code
5. **Scoring Engine**: Combines all signals into a weighted risk score

## Key Components

- **Backend API**: Node.js/Express service handling package analysis requests
- **Worker Nodes**: Process analysis jobs from queue (BullMQ/Redis)
- **Database**: PostgreSQL for package metadata, analysis results, and content storage
- **Cache Layer**: Redis for job queuing and result caching
- **Sandbox Environment**: Docker/Firecracker containers for safe package execution
- **Frontend**: React/Vue application with package search and dependency visualization

## Development Commands

Once the project is initialized, typical commands will be:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Database migrations
npm run migrate

# Start worker processes
npm run worker
```

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