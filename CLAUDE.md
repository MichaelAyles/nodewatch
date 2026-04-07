# CLAUDE.md

## What This Project Is

NodeWatch is an npm package malware detection system. It fetches packages from the npm registry, runs them through a multi-stage analysis pipeline, and produces risk scores. The core value is the static analysis engine — everything else is infrastructure to support it.

## Current State (April 2025)

### Working
- **Static analyzer** (`src/analyzers/static-analyzer.ts`, ~880 lines) — 40+ patterns, obfuscation detection, typosquatting, integrity checks. This is the heart of the project and it works well. Tested.
- **Deobfuscation engine** (`src/utils/deobfuscation.ts`) — base64, hex, unicode, URL encoding. Entropy analysis.
- **NPM fetcher** (`src/npm-fetcher.ts`) — downloads/extracts packages, SHA-256 hashing, file filtering.
- **API server** (`src/index.ts`, ~1030 lines) — Express 5 with BullMQ job queue, WebSocket (Socket.io), multi-tier Redis caching. Has mock/fallback data paths for when Convex isn't connected.
- **Worker** (`src/worker.ts`) — BullMQ worker, configurable concurrency, graceful shutdown.
- **Pipeline** (`src/pipeline.ts`) — orchestrates fetch → static analysis → (mock) LLM → scoring.
- **Config** (`src/config/index.ts`) — env loading, validation, typed config objects.
- **Cost tracker** (`src/services/cost-tracker.ts`) — LLM cost management with budget alerts. Ready but nothing real to track yet.
- **Tests** — 58 tests in `src/__tests__/`, Jest with ts-jest.

### Not Working / Stub
- **LLM analyzer** (`src/analyzers/llm-analyzer.ts`) — mock implementation. Returns fabricated results based on static analysis output. No real API calls.
- **Dynamic sandbox analysis** — Dockerode is a dependency but there's zero execution code. No packages are ever actually run.
- **Convex integration** — schema defined in `convex/schema.ts` (14 tables), mutations/queries in `convex/*.ts`, but the pipeline has TODO comments where DB calls should go. `pipeline-with-db.ts` exists but isn't wired up.
- **Frontend** (`src/frontend/`) — React 19 placeholder. Needs complete rebuild. Do not try to fix it, build fresh.
- **Deployment** — Railway never worked. Vercel is frontend-only. Nothing is running in production.
- **`semgrep` npm dependency** — this is NOT the real Semgrep (which is a Python binary). It's a placeholder v0.0.1 package. Dead weight.
- **`generate:convex` script** — no-op, just echoes a string.

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # API server with hot reload (tsx watch)
npm run worker:dev       # Worker process with hot reload
npm test                 # Run test suite (58 tests)
npm run build            # Compile TypeScript + webpack frontend
npm run dev:frontend     # Webpack dev server for frontend (port 8080)
```

The system needs both API server and worker running. Two terminals or use `npm run dev:all`.

## Architecture

```
Express API (port 3000)
  ├── POST /api/analyze → BullMQ job queue → Redis
  ├── GET /api/job/:id/status
  ├── GET /api/job/:id/result
  └── WebSocket (Socket.io) for real-time updates

Worker Process (separate)
  └── BullMQ worker → Analysis Pipeline
        ├── 1. Fetch package from NPM registry
        ├── 2. Extract and hash contents
        ├── 3. Static analysis (40+ patterns)
        ├── 4. LLM analysis (MOCK - not implemented)
        └── 5. Risk scoring (0-100, safe/low/medium/high/critical)
```

## Key Technical Notes

- **`@types/*` packages are incorrectly in `dependencies`** instead of `devDependencies`. Should be fixed.
- **Express 5** is used (was bleeding edge when the project started, more stable now).
- **`src/index.ts` is ~1030 lines** — the API server. It's large but organized by route groups. Consider splitting if adding more routes.
- **Redis is required** — the job queue won't work without it. The API server has fallback mock data for stats endpoints, but analysis requires Redis.
- **Convex is optional** — the system degrades to mock data without it. The pipeline runs fine without DB persistence, it just doesn't save results.
- **Multiple Dockerfiles exist** (Dockerfile, Dockerfile.api, Dockerfile.worker, Dockerfile.migrate) plus two compose files. None have been validated recently.

## Analysis Pipeline Details

The static analyzer checks for:
- Code execution: eval, Function constructor, setTimeout/setInterval with strings
- Process spawning: child_process, exec, spawn
- Network activity: HTTP/HTTPS requests, WebSockets, net connections
- File system: write, unlink, chmod, access patterns
- Prototype pollution: __proto__, Object.prototype modifications
- Environment access: process.env, process.argv harvesting
- Obfuscation: hex/unicode encoding, variable mangling, control flow obfuscation, packing, eval chains
- Typosquatting: Levenshtein distance against 30+ popular package names
- Integrity: suspicious install scripts, unexpected files, package.json inconsistencies

Risk scoring produces a 0-100 score with levels: safe, low, medium, high, critical.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests cover: static analyzer patterns, deobfuscation, content hashing, config validation, cache manager.

## What Needs To Happen Next

1. **LLM integration** — replace mock with real Claude API calls. Only send pre-flagged suspicious code to keep costs down.
2. **Database persistence** — wire up Convex mutations in the pipeline so results are actually saved.
3. **Frontend rebuild** — start fresh, the current one is a shell.
4. **Dynamic analysis** — implement actual sandbox execution in Docker containers.
5. **Clean up dependencies** — move `@types/*` to devDependencies, remove dead `semgrep` package.
6. **Deployment** — pick a platform and actually get it running.
