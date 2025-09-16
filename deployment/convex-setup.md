# Convex Production Deployment

## Prerequisites
- Convex account (free at convex.dev)
- Convex CLI: `npm install -g convex`
- Development deployment already working

## Step-by-Step Setup

### 1. Create Production Deployment
```bash
# Login to Convex (if not already)
npx convex login

# Deploy to production
npx convex deploy --prod

# This creates a new production deployment
# and updates .env.local with production URLs
```

### 2. Configure Production Environment
```bash
# The deploy command automatically:
# - Creates production deployment
# - Updates CONVEX_URL in .env.local
# - Pushes all functions and schema
```

### 3. Set Production Environment Variables
Update your Railway environment variables with the new production Convex URL:

```bash
# Get the production URL from .env.local
cat .env.local | grep CONVEX_URL

# Update Railway with production Convex URL
railway variables set CONVEX_URL=https://your-prod-deployment.convex.cloud
railway variables set CONVEX_DEPLOYMENT=your-prod-deployment-name
```

### 4. Verify Deployment
```bash
# Check deployment status
npx convex dashboard

# Test functions work
npx convex run stats:getSystemStats
```

## Production Configuration

### Environment Variables
After `npx convex deploy --prod`, your `.env.local` should contain:

```env
# Production Convex deployment
CONVEX_URL=https://your-prod-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-prod-deployment-name
```

### Database Schema
Production deployment includes:
- All tables from `convex/schema.ts`
- All functions from `convex/*.ts`
- Proper indexing for performance

### Functions Deployed
- `stats.ts` - Real-time statistics
- `packages.ts` - Package management
- `analysis.ts` - Analysis results
- `fileHashes.ts` - Deduplication

## Monitoring & Management

### Convex Dashboard
Access at: https://dashboard.convex.dev
- View function logs
- Monitor performance
- Manage data
- Check usage metrics

### Function Logs
```bash
# View function logs
npx convex logs --prod

# View specific function logs
npx convex logs --prod --function stats:getSystemStats
```

### Data Management
```bash
# Export data (backup)
npx convex export --prod

# Import data (restore)
npx convex import --prod backup.zip
```

## Performance Optimization

### Indexing
Ensure proper indexes in `convex/schema.ts`:
```typescript
export default defineSchema({
  packages: defineTable({
    name: v.string(),
    version: v.string(),
    created_at: v.number(),
    analysis_status: v.string(),
  })
  .index("by_name", ["name"])
  .index("by_status", ["analysis_status"])
  .index("by_created", ["created_at"]),
  
  // ... other tables with proper indexes
});
```

### Query Optimization
- Use indexes for filtering
- Limit result sets with `.take()`
- Use pagination for large datasets

## Security

### Access Control
Convex functions are secure by default:
- No direct database access from frontend
- All queries go through defined functions
- Built-in authentication support

### Environment Isolation
- Development and production deployments are separate
- No cross-environment data access
- Independent scaling and configuration

## Scaling

Convex automatically scales:
- Function execution scales with load
- Database scales with data size
- No manual configuration needed

## Troubleshooting

### Common Issues:

1. **Function Not Found Errors**
   - Ensure `npx convex deploy --prod` completed successfully
   - Check function names match exactly
   - Verify functions are exported properly

2. **Schema Validation Errors**
   - Check `convex/schema.ts` for errors
   - Ensure all tables have proper validation
   - Run `npx convex dev` locally to test schema

3. **Performance Issues**
   - Add proper indexes for queries
   - Use `.take()` to limit results
   - Check function logs for slow queries

4. **Environment Variable Issues**
   - Ensure Railway has correct CONVEX_URL
   - Check .env.local has production values
   - Verify deployment names match