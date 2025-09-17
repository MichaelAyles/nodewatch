# NodeWatch 🛡️

Real-time NPM package security analysis and malware detection platform.

## 🌐 Live Demo

- **Frontend**: https://nodewatch-frontend.vercel.app/
- **Database**: Convex (Production)
- **Backend**: Deployment in progress

## 🚀 Features

- **Real-time Security Analysis**: Instant package vulnerability scanning
- **Malware Detection**: AI-powered threat identification
- **Package Insights**: Comprehensive package analytics
- **Live Dashboard**: Real-time statistics and monitoring
- **Search & Discovery**: Advanced package search capabilities
- **Admin Panel**: Management interface for system administration

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Webpack** for bundling
- **WebSocket** for real-time updates
- **Deployed on Vercel**

### Backend
- **Node.js 20** with Express
- **TypeScript** for type safety
- **WebSocket** for real-time communication
- **Redis** for caching and job queues
- **BullMQ** for background processing

### Database
- **Convex** for real-time data
- **File deduplication** system
- **Package analysis** storage

### AI/ML
- **OpenRouter API** for LLM analysis
- **Multiple model support**
- **Cost tracking** and optimization

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Database   │
│   (Vercel)  │◄──►│ (Railway)   │◄──►│  (Convex)   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                   ┌─────────────┐
                   │    Redis    │
                   │  (Caching)  │
                   └─────────────┘
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Redis (for local development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodewatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start services**
   ```bash
   # Start Redis
   npm run dev:redis
   
   # Start Convex
   npm run dev:convex
   
   # Start backend
   npm run dev
   
   # Start frontend (in another terminal)
   npm run dev:frontend
   ```

5. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## 📦 Available Scripts

### Development
- `npm run dev` - Start backend server
- `npm run dev:frontend` - Start frontend dev server
- `npm run dev:all` - Start all services
- `npm run dev:convex` - Start Convex development

### Building
- `npm run build` - Build both frontend and backend
- `npm run build:frontend` - Build frontend only
- `npm run build:backend` - Build backend only

### Deployment
- `npm run deploy:vercel` - Deploy frontend to Vercel
- `npm run deploy:railway` - Deploy backend to Railway
- `npm run deploy:convex` - Deploy database to Convex

## 🔧 Configuration

### Environment Variables

#### Required
- `CONVEX_URL` - Convex deployment URL
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM analysis
- `REDIS_URL` - Redis connection string

#### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password

## 🔒 Security Features

- **Static Analysis**: Code pattern detection
- **Dynamic Analysis**: Runtime behavior monitoring
- **LLM Analysis**: AI-powered threat detection
- **File Deduplication**: Efficient storage and analysis
- **Rate Limiting**: API protection
- **Admin Authentication**: Secure management interface

## 📊 Monitoring

- **Real-time Statistics**: Live system metrics
- **Cost Tracking**: LLM API usage monitoring
- **Performance Metrics**: Response times and throughput
- **Error Logging**: Comprehensive error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: See `/docs` directory
- **Community**: Discord/Slack (links TBD)

---

**NodeWatch** - Protecting the npm ecosystem, one package at a time. 🛡️✨