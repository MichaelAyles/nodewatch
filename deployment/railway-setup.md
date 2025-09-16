# Railway Deployment Setup

## Prerequisites
- Railway account (free at railway.app)
- GitHub repository connected
- Railway CLI installed: `npm install -g @railway/cli`

## Step-by-Step Setup

### 1. Create Railway Project
```bash
# Login to Railway
railway login

# Create new project
railway init

# Link to existing project (if already created)
railway link [project-id]
```

### 2. Add Redis Service
```bash
# Add Redis to your project
railway add redis

# This automatically provides REDIS_URL environment variable
```

### 3. Configure Environment Variables
In Railway dashboard or via CLI:

```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set LOG_LEVEL=info

# Add your Convex credentials
railway variables set CONVEX_URL=https://your-deployment.convex.cloud
railway variables set CONVEX_DEPLOYMENT=your-deployment-name

# Add OpenRouter API key
railway variables set OPENROUTER_API_KEY=your_key_here

# Add admin credentials
railway variables set ADMIN_USERNAME=admin
railway variables set ADMIN_PASSWORD=your_secure_password

# Add security secrets
railway variables set SESSION_SECRET=$(openssl rand -base64 32)
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Add frontend URL (will be updated after Vercel deployment)
railway variables set FRONTEND_URL=https://your-app.vercel.app
```

### 4. Deploy Backend
```bash
# Deploy to Railway
railway up

# Or set up automatic deployments from GitHub
# (Recommended - deploys automatically on git push)
```

### 5. Configure Custom Domain (Optional)
```bash
# Add custom domain in Railway dashboard
# Point your DNS to Railway's provided URL
```

## Railway Configuration Files

The following files configure Railway deployment:

- `railway.json` - Railway service configuration
- `Procfile` - Process definitions (web server + worker)
- `package.json` - Build and start scripts

## Monitoring & Logs

```bash
# View logs
railway logs

# Monitor deployment
railway status

# Open Railway dashboard
railway open
```

## Scaling

Railway automatically scales based on traffic. For manual scaling:

1. Go to Railway dashboard
2. Select your service
3. Adjust resources in Settings > Resources

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check `railway logs` for build errors
   - Ensure all dependencies are in package.json
   - Verify build scripts work locally

2. **Environment Variables**
   - Use `railway variables` to check current values
   - Ensure REDIS_URL is automatically set by Redis service

3. **WebSocket Issues**
   - Railway supports WebSockets by default
   - Check CORS configuration for frontend domain

4. **Memory/CPU Limits**
   - Monitor usage in Railway dashboard
   - Upgrade plan if needed for higher limits