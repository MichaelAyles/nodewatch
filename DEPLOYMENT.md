# 🚀 NodeWatch Production Deployment Guide

Complete deployment guide for the **Vercel + Railway + Convex** stack.

## 📋 **Deployment Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Vercel      │    │     Railway     │    │     Convex      │
│   (Frontend)    │───▶│   (Backend)     │───▶│   (Database)    │
│                 │    │                 │    │                 │
│ • React App     │    │ • Express API   │    │ • Real-time DB  │
│ • Static Assets │    │ • WebSocket     │    │ • Analytics     │
│ • Global CDN    │    │ • Redis Cache   │    │ • File Storage  │
│ • Auto Deploy   │    │ • Worker Proc   │    │ • Edge Functions│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 **Quick Start (15 minutes)**

### **Prerequisites**
- [x] GitHub repository with NodeWatch code
- [x] Accounts: [Vercel](https://vercel.com), [Railway](https://railway.app), [Convex](https://convex.dev)
- [x] CLI tools: `npm install -g vercel @railway/cli convex`

### **1. Deploy Database (Convex) - 3 minutes**
```bash
# Deploy Convex to production
npx convex deploy --prod

# Note the production URL for later
echo "CONVEX_URL from .env.local:"
cat .env.local | grep CONVEX_URL
```

### **2. Deploy Backend (Railway) - 5 minutes**
```bash
# Login and create project
railway login
railway init

# Add Redis service
railway add redis

# Set environment variables (replace with your values)
railway variables set NODE_ENV=production
railway variables set CONVEX_URL=https://your-prod-deployment.convex.cloud
railway variables set OPENROUTER_API_KEY=your_openrouter_key
railway variables set ADMIN_PASSWORD=your_secure_password

# Deploy backend
railway up
```

### **3. Deploy Frontend (Vercel) - 5 minutes**
```bash
# Login and deploy
vercel login
vercel

# Set environment variables in Vercel dashboard:
# REACT_APP_API_URL = https://your-railway-app.railway.app
# NODE_ENV = production

# Deploy to production
vercel --prod
```

### **4. Update CORS (2 minutes)**
Update `src/index.ts` with your Vercel URL:
```typescript
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://nodewatch.dev' // your custom domain
  ]
}));
```

Redeploy Railway: `railway up`

## 📚 **Detailed Setup Guides**

- [🚂 Railway Backend Setup](deployment/railway-setup.md)
- [▲ Vercel Frontend Setup](deployment/vercel-setup.md)  
- [🔄 Convex Database Setup](deployment/convex-setup.md)

## 🔧 **Configuration Files**

All necessary config files are included:

- `vercel.json` - Vercel deployment configuration
- `railway.json` - Railway service configuration
- `Procfile` - Process definitions for Railway
- `.env.production` - Environment variables template

## 🌐 **Environment Variables**

### **Railway (Backend)**
```env
NODE_ENV=production
PORT=3000
CONVEX_URL=https://your-prod-deployment.convex.cloud
REDIS_URL=redis://... (auto-provided by Railway)
OPENROUTER_API_KEY=your_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
FRONTEND_URL=https://your-vercel-app.vercel.app
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

### **Vercel (Frontend)**
```env
NODE_ENV=production
REACT_APP_API_URL=https://your-railway-app.railway.app
REACT_APP_WEBSOCKET_URL=wss://your-railway-app.railway.app
```

### **Convex (Database)**
```env
CONVEX_URL=https://your-prod-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-prod-deployment-name
```

## 🚀 **Deployment Commands**

### **Individual Services**
```bash
# Deploy frontend only
npm run deploy:vercel

# Deploy backend only  
npm run deploy:railway

# Deploy database only
npm run deploy:convex
```

### **Full Deployment**
```bash
# Deploy everything in order
npm run deploy:convex
npm run deploy:railway  
npm run deploy:vercel
```

## 📊 **Monitoring & Health Checks**

### **Service URLs**
- **Frontend**: https://your-vercel-app.vercel.app
- **Backend API**: https://your-railway-app.railway.app/health
- **Admin Dashboard**: https://your-railway-app.railway.app/admin
- **Convex Dashboard**: https://dashboard.convex.dev

### **Health Checks**
```bash
# Test backend health
curl https://your-railway-app.railway.app/health

# Test API endpoints
curl https://your-railway-app.railway.app/api/stats

# Test WebSocket (in browser console)
const ws = new WebSocket('wss://your-railway-app.railway.app');
```

## 💰 **Cost Estimation**

### **Monthly Costs (Production)**
- **Vercel**: Free (Hobby) / $20 (Pro)
- **Railway**: $5-20 (usage-based)
- **Convex**: Free (generous limits) / usage-based
- **Total**: ~$5-40/month

### **Scaling Costs**
- **High Traffic**: $50-100/month
- **Enterprise**: $100-500/month

## 🔒 **Security Configuration**

### **HTTPS & SSL**
- ✅ Automatic HTTPS on all services
- ✅ SSL certificates auto-renewed
- ✅ Security headers configured

### **Environment Security**
- ✅ Environment variables encrypted
- ✅ No secrets in code
- ✅ Production/dev isolation

### **API Security**
- ✅ CORS properly configured
- ✅ Rate limiting (Railway)
- ✅ Input validation
- ✅ Admin authentication

## 🎯 **Custom Domains**

### **Setup Custom Domain**
1. **Buy domain** (e.g., nodewatch.dev)
2. **Configure Vercel**:
   ```bash
   vercel domains add nodewatch.dev
   vercel domains add www.nodewatch.dev
   ```
3. **Configure Railway** (optional API subdomain):
   ```bash
   # In Railway dashboard: api.nodewatch.dev
   ```
4. **Update DNS** as instructed by services

### **SSL Certificates**
- ✅ Automatic SSL on Vercel
- ✅ Automatic SSL on Railway
- ✅ Auto-renewal handled

## 🔄 **CI/CD Pipeline**

### **Automatic Deployments**
Both Vercel and Railway support automatic deployments:

1. **Connect GitHub repositories**
2. **Configure branch deployments**:
   - `main` → Production
   - `develop` → Staging (optional)
3. **Auto-deploy on git push**

### **Deployment Workflow**
```bash
# Development workflow
git checkout -b feature/new-feature
# ... make changes ...
git push origin feature/new-feature
# ... create PR, review, merge to main ...
# 🚀 Automatic deployment to production!
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Check build logs
vercel logs
railway logs

# Test builds locally
npm run build:frontend
npm run build:backend
```

#### **Environment Variables**
```bash
# Check Railway variables
railway variables

# Check Vercel variables
vercel env ls
```

#### **CORS Issues**
```bash
# Update CORS in src/index.ts
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app']
}));
```

#### **WebSocket Issues**
- Ensure Railway supports WebSockets (it does)
- Check WebSocket URL in frontend
- Test connection in browser dev tools

### **Performance Issues**
- Monitor Railway metrics dashboard
- Check Convex function performance
- Use Vercel analytics for frontend

## 📈 **Scaling Strategy**

### **Traffic Growth**
1. **0-1K users**: Free tiers sufficient
2. **1K-10K users**: Upgrade to paid plans (~$25/month)
3. **10K+ users**: Consider enterprise options

### **Horizontal Scaling**
- **Railway**: Auto-scales with traffic
- **Vercel**: Global CDN handles traffic
- **Convex**: Serverless, scales automatically

### **Performance Optimization**
- Enable Railway auto-scaling
- Use Vercel Edge Functions for API routes
- Optimize Convex queries with proper indexing

## 🎉 **Go Live Checklist**

- [ ] All services deployed and healthy
- [ ] Environment variables configured
- [ ] CORS updated with production URLs
- [ ] Custom domain configured (optional)
- [ ] SSL certificates active
- [ ] Admin dashboard accessible
- [ ] WebSocket connections working
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Real-time features working
- [ ] Monitoring and alerts set up

## 🆘 **Support & Resources**

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Convex Docs**: https://docs.convex.dev
- **NodeWatch Issues**: https://github.com/yourusername/nodewatch/issues

---

**🚀 Ready to deploy? Start with the [Quick Start](#-quick-start-15-minutes) guide above!**