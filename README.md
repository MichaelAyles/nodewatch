# NodeWatch

npm package malware detection through static analysis, deobfuscation, and (planned) LLM-powered code review. Analyzes packages for suspicious patterns, obfuscation, typosquatting, and supply chain attack indicators.

## Why

The Node ecosystem has a supply chain security problem. `ua-parser-js`, `colors`, `faker`, `event-stream`, `@pnpm/exe` — the list keeps growing. NodeWatch aims to catch malicious packages before they land in your `node_modules`.

## What Works Today

- **Static analysis engine** — 40+ detection patterns covering eval/Function constructor abuse, child_process spawning, network exfiltration, filesystem manipulation, prototype pollution, environment variable harvesting
- **Obfuscation detection** — hex/unicode encoding, variable mangling, control flow obfuscation, packing, eval chains, entropy analysis
- **Deobfuscation engine** — decodes base64, hex, unicode escapes, URL encoding; identifies suspicious strings in decoded content
- **Typosquatting detection** — Levenshtein distance matching against popular packages, character substitution detection
- **Package integrity checks** — suspicious install scripts, unexpected files, package.json inconsistencies
- **NPM fetcher** — downloads and extracts packages from the registry, SHA-256 content hashing, smart file filtering
- **Job queue architecture** — BullMQ/Redis for non-blocking analysis with Express API for job submission and status
- **Worker process** — separate background workers for analysis, configurable concurrency
- **Cost tracking** — built-in LLM cost management with budget alerts (ready for when LLM integration goes live)
- **Test suite** — 58 tests covering core analyzers and utilities

## What Doesn't Work Yet

- **LLM analysis** — interface defined, mock implementation only. No real API calls to Claude/OpenAI.
- **Dynamic sandbox analysis** — schema exists, Dockerode is a dependency, but there's no execution code. Packages are never actually run.
- **Database persistence** — Convex schema is defined with 14 tables, mutations/queries exist, but the pipeline has TODO comments where DB calls should be. Results aren't persisted.
- **Frontend** — needs a complete rebuild. The existing React components are a placeholder landing page with incomplete data binding.
- **Deployment** — Railway never worked. Vercel deployment is frontend-only (and the frontend is a shell). Nothing is actually running in production.

## Getting Started

### Prerequisites

- Node.js 20+
- Redis (local or remote)

### Install and Run

```bash
npm install

# Terminal 1: API server
npm run dev

# Terminal 2: Worker process
npm run worker:dev
```

### Run Tests

```bash
npm test
```

### API

```
POST /api/analyze          — Queue a package for analysis
GET  /api/job/:id/status   — Check job progress
GET  /api/job/:id/result   — Get analysis results
GET  /api/stats             — System statistics
GET  /api/queue/stats       — Queue statistics
GET  /api/health/metrics    — Health check
```

## Project Structure

```
src/
  analyzers/
    static-analyzer.ts    — Core analysis engine (40+ patterns, obfuscation, typosquatting)
    llm-analyzer.ts       — LLM integration (mock/stub)
  services/
    cost-tracker.ts       — LLM cost management
    analytics.ts          — Event tracking
  utils/
    deobfuscation.ts      — Multi-encoding deobfuscation engine
    redis.ts              — Redis connection and caching
    cache-manager.ts      — Multi-tier cache
    logger.ts             — Structured logging
    hash.ts               — Content hashing
  config/
    index.ts              — Configuration with env validation
  frontend/              — React 19 app (needs rebuild)
  index.ts               — Express API server (~1030 lines)
  worker.ts              — BullMQ worker process
  pipeline.ts            — Analysis pipeline orchestration
  npm-fetcher.ts         — NPM registry integration
  __tests__/             — Jest test suite
convex/
  schema.ts              — Database schema (14 tables)
  packages.ts            — Package CRUD
  analysis.ts            — Analysis results storage
  stats.ts               — System statistics
  fileHashes.ts          — Content deduplication
```

## Configuration

Key environment variables (see `src/config/index.ts` for full list):

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | Redis connection string |
| `CONVEX_URL` | For DB | Convex deployment URL |
| `OPENROUTER_API_KEY` | For LLM | LLM API access |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment |
| `LOG_LEVEL` | No | debug/info/warn/error |

## License

MIT
