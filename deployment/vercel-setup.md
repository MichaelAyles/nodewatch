# Vercel Deployment Setup

## Prerequisites
- Vercel account (free at vercel.com)
- GitHub repository
- Vercel CLI installed: `npm install -g vercel`

## Step-by-Step Setup

### 1. Prepare Frontend Build
```bash
# Test frontend build locally
npm run build:frontend

# Verify dist/frontend directory is created
ls -la dist/frontend/
```

### 2. Configure Vercel Project
```bash
# Login to Vercel
vercel login

# Initialize project (run from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: nodewatch
# - Directory: ./
# - Override settings? Yes
#   - Build Command: npm run build:vercel
#   - Output Directory: dist/frontend
#   - Install Command: npm install
```

### 3. Set Environment Variables
In Vercel dashboard or via CLI:

```bash
# Set build environment
vercel env add NODE_ENV production

# Add API URL (Railway backend URL)
vercel env add REACT_APP_API_URL https://your-railway-app.railway.app

# Add any other frontend environment variables
vercel env add REACT_APP_WEBSOCKET_URL wss://your-railway-app.railway.app
```

### 4. Deploy to Production
```bash
# Deploy to production
vercel --prod

# Or set up automatic deployments (recommended)
# Vercel automatically deploys on git push to main branch
```

### 5. Configure Custom Domain (Optional)
```bash
# Add custom domain via Vercel dashboard
# Or via CLI:
vercel domains add nodewatch.dev
vercel domains add www.nodewatch.dev

# Configure DNS records as instructed by Vercel
```

## Vercel Configuration Files

- `vercel.json` - Vercel deployment configuration
- `package.json` - Build scripts and dependencies

## Build Configuration

### Build Command
```json
{
  "buildCommand": "npm run build:vercel"
}
```

### Output Directory
```json
{
  "outputDirectory": "dist/frontend"
}
```

### Environment Variables
Set in Vercel dashboard under Project Settings > Environment Variables:

- `NODE_ENV` = `production`
- `REACT_APP_API_URL` = `https://your-railway-app.railway.app`
- `REACT_APP_WEBSOCKET_URL` = `wss://your-railway-app.railway.app`

## Performance Optimizations

Vercel automatically provides:
- Global CDN
- Image optimization
- Automatic compression
- Edge caching
- HTTP/2 and HTTP/3

## Monitoring

- View deployments: `vercel ls`
- Check logs: `vercel logs [deployment-url]`
- Analytics available in Vercel dashboard

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check build logs in Vercel dashboard
   - Test `npm run build:frontend` locally
   - Ensure all dependencies are in package.json

2. **API Connection Issues**
   - Verify REACT_APP_API_URL is correct
   - Check CORS configuration in Railway backend
   - Ensure Railway service is running

3. **WebSocket Connection Issues**
   - Verify WebSocket URL is correct
   - Check Railway WebSocket support
   - Test WebSocket connection in browser dev tools

4. **Routing Issues**
   - Vercel.json handles SPA routing automatically
   - All routes redirect to index.html for client-side routing