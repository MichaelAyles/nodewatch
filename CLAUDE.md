# CLAUDE.md

## What This Project Is

NodeWatch is an npm package malware detection system. It fetches packages from the npm registry, runs them through a multi-stage analysis pipeline (static analysis, Docker sandboxing, optional LLM review), and produces risk scores. Deployed on a self-hosted machine via Docker Compose.

## Current State (April 2025)

### Working
- **Static analyzer** (`src/analyzers/static-analyzer.ts`) — 40+ patterns, obfuscation detection (context-aware, skips minified files and legitimate encoding), typosquatting via Levenshtein, integrity checks. Deduplicated findings, scored by unique signal types.
- **Dynamic sandbox** (`src/analyzers/dynamic-analyzer.ts`) — installs packages in isolated Docker containers (memory-limited, capability-dropped, PID-limited). Monitors network connections, files created outside node_modules, process spawning, resource usage. Scores based on suspicious activity.
- **Deobfuscation engine** (`src/utils/deobfuscation.ts`) — base64, hex, unicode, URL encoding. Strips legitimate patterns (regex ranges, char maps) before analysis.
- **NPM fetcher** (`src/npm-fetcher.ts`) — downloads/extracts packages, SHA-256 hashing.
- **API server** (`src/index.ts`) — Express 5, BullMQ job queue, WebSocket (Socket.io), multi-tier Redis caching. Serves frontend as static files.
- **Worker** (`src/worker.ts`) — BullMQ worker, configurable concurrency, graceful shutdown.
- **Pipeline** (`src/pipeline-with-db.ts`) — orchestrates fetch → static → dynamic → LLM → scoring. Persists all results to Postgres.
- **Database** — Postgres via `src/database/postgres-client.ts`. Migration in `src/database/migrate.ts`. Tables: packages, analysis_results, risk_scores, file_hashes, package_files.
- **Frontend** (`src/frontend/`) — React 19, soft modern design. Search, job progress, score ring, results view, system stats.
- **Config** (`src/config/index.ts`) — env loading, validation, typed config objects.
- **Tests** — 95 tests in `src/__tests__/`, Jest with ts-jest. All passing.

### Partially Working
- **LLM analyzer** (`src/analyzers/llm-analyzer.ts`) — uses `@anthropic-ai/sdk` (Claude). Builds prompts from flagged code, parses structured JSON. Falls back to mock when `ANTHROPIC_API_KEY` isn't set. Not tested in production yet.

### Not Working / Stub
- **Comment-aware parsing** — static analyzer still flags patterns in JSDoc comments (e.g. lodash's `fs.writeFileSync` in docs).

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # API server with hot reload (tsx watch)
npm run worker:dev       # Worker process with hot reload
npm test                 # Run test suite (95 tests)
npm run db:migrate       # Run Postgres migrations
npm run build            # Compile TypeScript + webpack frontend
npm run dev:frontend     # Webpack dev server for frontend (port 8080)
```

Two terminals: API server + worker. Or `docker compose up` for everything.

## Architecture

```
Docker Compose
├── api (port 3000)
│   ├── POST /api/analyze → BullMQ job queue → Redis
│   ├── GET /api/job/:id/status
│   ├── GET /api/job/:id/result
│   ├── Static frontend files (dist/frontend/)
│   └── WebSocket (Socket.io) for real-time updates
├── worker
│   └── BullMQ worker → Analysis Pipeline
│         ├── 1. Fetch package from NPM registry
│         ├── 2. Extract and hash contents
│         ├── 3. Static analysis (context-aware, deduplicated)
│         ├── 4. Dynamic sandbox (Docker container, monitors behavior)
│         ├── 5. LLM analysis (Claude API when key set, mock otherwise)
│         └── 6. Risk scoring (weighted combination of all stages)
├── postgres — packages, analysis_results, risk_scores
└── redis — job queue (BullMQ) + response caching
```

## Deployment

Self-hosted on an i7/32GB machine via Docker Compose. Accessible via Tailscale at `100.79.131.40:3000`. No domain configured yet — can add via Cloudflare Tunnel when ready.

Docker socket is mounted into the worker container so it can spawn sandbox containers on the host Docker daemon.

## Key Technical Notes

- **Express 5** is used.
- **`src/index.ts` is ~1000 lines** — the API server. Organized by route groups.
- **Redis is required** — the job queue won't work without it.
- **Postgres is required** — results are persisted there.
- **Docker socket access** — the worker needs `/var/run/docker.sock` mounted to run sandbox analysis. Set `DISABLE_DYNAMIC_ANALYSIS=true` to skip.
- **Sandbox containers** use `node:20-alpine`, dropped capabilities, 256MB memory limit, 50% CPU, PID limit 64.

## Analysis Pipeline Details

The static analyzer checks for:
- Code execution: eval, Function constructor, setTimeout/setInterval with strings
- Process spawning: child_process.exec/execSync, spawn
- Network activity: HTTP/HTTPS requests, WebSockets, net connections
- File system: write, unlink, chmod, access patterns
- Prototype pollution: __proto__, Object.prototype modifications
- Obfuscation: deobfuscation engine strips legitimate encoding (regex ranges, char maps) before analysis
- Typosquatting: Levenshtein distance against 30+ popular package names
- Integrity: suspicious install scripts, unexpected files, package.json inconsistencies

The dynamic analyzer monitors:
- Network connections during install
- Files created outside node_modules
- Process spawning during install scripts
- Memory/CPU/network resource usage
- Install timeout (suspicious if takes too long)

Risk scoring: 0-100, levels: safe (<10), low (<30), medium (<50), high (<70), critical (>=70).

## Testing

```bash
npm test              # Run all 95 tests
npm run test:watch    # Watch mode
```

Tests cover: static analyzer patterns, deobfuscation engine, content hashing, config validation, cache manager.

## What Could Be Done Next

1. **Comment-aware parsing** — strip JSDoc/comments before pattern matching to eliminate remaining false positives
2. **Cloudflare Tunnel** — expose on a domain
3. **Allowlist/reputation** — known-good packages get a baseline score reduction
4. **Batch analysis** — analyze all deps from a package.json
5. **CI integration** — webhook notifications on analysis completion
