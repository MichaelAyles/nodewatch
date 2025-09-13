# NodeWatch 🔍

A comprehensive security analysis system for npm packages that detects potential malware and malicious code patterns using static analysis, dynamic sandboxing, and AI-powered code review.

## Features

- **Multi-Stage Analysis Pipeline**
  - Static code analysis with pattern matching
  - Dynamic behavioral analysis (sandbox execution)
  - AI-powered code review for suspicious patterns
  
- **Intelligent Detection**
  - Detects eval() and dynamic code execution
  - Identifies network calls and filesystem access
  - Recognizes obfuscated and encoded content
  - Prototype pollution detection
  
- **Risk Scoring**
  - Comprehensive 0-100 risk score
  - Risk levels: Safe, Low, Medium, High, Critical
  - Detailed reasoning for risk assessments

- **Database Integration**
  - Powered by Convex for real-time data sync
  - Content deduplication with SHA-256 hashing
  - Historical analysis tracking

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free at [convex.dev](https://convex.dev))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nodewatch.git
cd nodewatch
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npx convex login
npx convex dev
```
This will create a `.env.local` file with your Convex credentials.

4. Start the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Usage

### Web Interface

Navigate to http://localhost:3000 and enter an npm package name to analyze.

### API Endpoints

#### Analyze a package
```bash
POST /api/analyze
Content-Type: application/json

{
  "name": "package-name",
  "version": "1.0.0"  // optional, defaults to "latest"
}
```

#### Get package analysis
```bash
GET /api/package/:name
```

#### List recent packages
```bash
GET /api/packages/recent
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Express   │────▶│   Pipeline  │
│  (HTML/JS)  │     │     API     │     │   Manager   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Convex    │     │  Analyzers  │
                    │   Database  │     │             │
                    └─────────────┘     │  - Static   │
                                       │  - Dynamic  │
                                       │  - LLM      │
                                       └─────────────┘
```

## Project Structure

```
nodewatch/
├── src/
│   ├── index.ts              # Express server & API routes
│   ├── pipeline-with-db.ts   # Analysis pipeline with DB integration
│   ├── npm-fetcher.ts        # NPM registry interaction
│   ├── convex-client.ts      # Convex database client
│   └── analyzers/
│       ├── static-analyzer.ts # Pattern-based detection
│       └── llm-analyzer.ts    # AI-powered analysis
├── convex/
│   ├── schema.ts             # Database schema
│   ├── packages.ts           # Package mutations/queries
│   └── analysis.ts           # Analysis results handling
├── cache/                    # Local cache directory
└── dist/                     # Compiled TypeScript output
```

## Development

### Available Scripts

```bash
npm run dev    # Start development server with hot reload
npm run start  # Start production server
npm run build  # Compile TypeScript to JavaScript
npm test       # Run tests (when implemented)
```

### Environment Variables

Create a `.env.local` file (automatically created by Convex):
```env
CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment_name
OPENAI_API_KEY=your_openai_key  # Optional, for LLM analysis
```

## Security Considerations

- All package execution happens in isolated sandbox environments
- Never execute untrusted code outside containers
- Resource limits enforced for all analysis jobs
- All activities logged for audit purposes

## Roadmap

- [ ] Real OpenAI/Claude API integration for LLM analysis
- [ ] Docker-based dynamic analysis sandbox
- [ ] Dependency tree visualization
- [ ] Batch analysis for multiple packages
- [ ] Historical trend analysis
- [ ] GitHub integration for repository analysis
- [ ] npm audit integration
- [ ] Semgrep rules customization
- [ ] Webhook notifications
- [ ] Public API with rate limiting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Socket.dev and other npm security tools
- Built with Convex for real-time database
- Uses ripgrep patterns for code analysis

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**⚠️ Disclaimer**: This tool provides security analysis but should not be the only factor in determining package safety. Always review packages thoroughly before using them in production.