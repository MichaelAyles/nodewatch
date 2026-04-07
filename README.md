# NodeWatch

npm package malware detection through static analysis, dynamic sandboxing, deobfuscation, and (optional) LLM-powered code review.

## Why

The Node ecosystem has a supply chain security problem. `ua-parser-js`, `colors`, `faker`, `event-stream`, `@pnpm/exe` — the list keeps growing. NodeWatch analyzes packages for suspicious patterns, obfuscation, typosquatting, and runtime behavior before they land in your `node_modules`.

## How It Works

Submit a package name, and the pipeline:

1. **Fetches** the package from the npm registry, downloads and extracts the tarball
2. **Static analysis** — 40+ pattern detectors for eval abuse, child_process spawning, network exfiltration, filesystem manipulation, prototype pollution, obfuscation, typosquatting
3. **Dynamic sandbox** — installs the package inside an isolated Docker container, monitors network connections, file creation outside node_modules, process spawning, and resource usage
4. **LLM analysis** (optional) — sends flagged code to Claude for deeper reasoning about intent
5. **Scoring** — weighted combination of all stages, produces a 0-100 risk score

## Running It

### Prerequisites

- Docker (required — runs the app and the sandbox containers)

### Quick Start

```bash
git clone https://github.com/MichaelAyles/nodewatch.git
cd nodewatch
cp .env.example .env  # Edit with your values
docker compose up -d
```

The app is at **http://localhost:3000** — frontend and API on one port.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Database password (auto-generated in .env) |
| `ANTHROPIC_API_KEY` | No | Enables LLM analysis via Claude |
| `LLM_MODEL` | No | Claude model (default: claude-sonnet-4-6) |
| `DISABLE_DYNAMIC_ANALYSIS` | No | Set to `true` to skip sandbox |
| `SANDBOX_TIMEOUT_MS` | No | Sandbox timeout (default: 30000) |
| `SANDBOX_MEMORY_LIMIT_MB` | No | Sandbox memory limit (default: 256) |

### Development

```bash
npm install
npm run dev              # API server with hot reload
npm run worker:dev       # Worker process with hot reload
npm test                 # 95 tests
npm run db:migrate       # Run Postgres migrations
```

Requires Redis and Postgres running locally (or use `docker compose up postgres redis`).

### API

```
POST /api/analyze          — { "name": "package-name", "version": "1.0.0" }
GET  /api/job/:id/status   — Job progress
GET  /api/job/:id/result   — Full analysis results
GET  /api/stats            — System statistics
GET  /api/queue/stats      — Queue status
GET  /api/health/metrics   — Health check
```

## Architecture

```
Docker Compose
├── api        — Express server, serves frontend + REST API
├── worker     — BullMQ worker, runs analysis pipeline
│                ├── Static analysis (in-process)
│                ├── Dynamic sandbox (spawns Docker containers)
│                └── LLM analysis (Claude API, optional)
├── postgres   — Package metadata, analysis results, risk scores
└── redis      — Job queue (BullMQ) and response caching
```

## Project Structure

```
src/
  analyzers/
    static-analyzer.ts    — Pattern detection, obfuscation, typosquatting
    dynamic-analyzer.ts   — Docker sandbox execution and monitoring
    llm-analyzer.ts       — Claude API integration
  database/
    postgres-client.ts    — PostgresAdapter with all queries
    migrate.ts            — Schema migration
  services/
    cost-tracker.ts       — LLM cost management
  utils/
    deobfuscation.ts      — Multi-encoding deobfuscation engine
    redis.ts              — Redis connection and caching
    logger.ts             — Structured logging
  frontend/              — React 19 (soft modern design)
  index.ts               — Express API server
  worker.ts              — BullMQ worker process
  pipeline-with-db.ts    — Analysis pipeline orchestration
  npm-fetcher.ts         — NPM registry integration
  __tests__/             — Jest test suite (95 tests)
```

## License

MIT
