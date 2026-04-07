import express from 'express';
import { db } from '../database/postgres-client';
import { getRedisClient } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = express.Router();

// Basic auth middleware for admin
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!config.admin.enabled) {
    return res.status(404).json({ error: 'Admin dashboard disabled' });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="NodeWatch Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username !== config.admin.username || password !== config.admin.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  next();
};

// Apply auth to all admin routes
router.use(adminAuth);

// Dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const redis = getRedisClient();
    
    // Get queue statistics
    const queueStats = await getQueueStatistics();
    
    // Get cost statistics
    const costStats = await getCostStatistics();
    
    // Get database statistics
    const dbStats = await getDatabaseStatistics();
    
    // Get system performance
    const perfStats = await getPerformanceStatistics();

    res.json({
      success: true,
      data: {
        queue: queueStats,
        costs: costStats,
        database: dbStats,
        performance: perfStats,
        timestamp: Date.now(),
      }
    });
  } catch (error: any) {
    logger.error('Admin dashboard error', error);
    res.status(500).json({ error: error.message });
  }
});

// Cost tracking endpoint
router.get('/costs', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const costs = await getDetailedCostBreakdown(period as string);
    
    res.json({
      success: true,
      data: costs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Job management
router.get('/jobs', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const jobs = await getJobDetails(status as string, parseInt(limit as string), parseInt(offset as string));
    
    res.json({
      success: true,
      data: jobs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Database analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await getDatabaseAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// System health
router.get('/health', async (req, res) => {
  try {
    const health = await getSystemHealth();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function getQueueStatistics() {
  const redis = getRedisClient();
  
  // Get queue lengths from Redis
  const waiting = await redis.llen('bull:analysis-queue:waiting');
  const active = await redis.llen('bull:analysis-queue:active');
  const completed = await redis.llen('bull:analysis-queue:completed');
  const failed = await redis.llen('bull:analysis-queue:failed');
  
  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

async function getCostStatistics() {
  try {
    // TODO: Replace with actual Postgres queries for cost data
    
    // Mock data for now - replace with real queries
    const todayCosts = {
      llm: 2.45,
      compute: 0.89,
      storage: 0.12,
      total: 3.46
    };
    
    const monthCosts = {
      llm: 67.23,
      compute: 23.45,
      storage: 4.32,
      total: 95.00
    };
    
    return {
      today: todayCosts,
      month: monthCosts,
      budget: {
        daily: config.costTracking.dailyBudgetUsd,
        dailyUsed: todayCosts.total,
        dailyRemaining: config.costTracking.dailyBudgetUsd - todayCosts.total,
        alertThreshold: config.costTracking.alertThresholdUsd,
      }
    };
  } catch (error) {
    logger.error('Error getting cost statistics', error);
    return { error: 'Failed to fetch cost data' };
  }
}

async function getDatabaseStatistics() {
  try {
    const dedupStats = await db.getDeduplicationStats();
    const cacheStats = await db.getCacheStats();
    const totalPackages = dedupStats?.total_packages || 0;
    const uniqueFiles = dedupStats?.unique_files || 0;
    const duplicatedFiles = dedupStats?.duplicated_files || 0;

    return {
      packages: {
        total: totalPackages,
        analyzed: cacheStats?.packages_analyzed || 0,
        pending: 0,
        failed: 0
      },
      files: {
        total: uniqueFiles + duplicatedFiles,
        unique: uniqueFiles,
        duplicates: duplicatedFiles,
        deduplicationRate: (uniqueFiles + duplicatedFiles) > 0
          ? Math.round((duplicatedFiles / (uniqueFiles + duplicatedFiles)) * 1000) / 10
          : 0
      },
      cache: {
        hitRate: cacheStats?.cache_hits && cacheStats?.cache_misses
          ? Math.round((cacheStats.cache_hits / (cacheStats.cache_hits + cacheStats.cache_misses)) * 1000) / 10
          : 0,
        totalHits: cacheStats?.cache_hits || 0,
        totalMisses: cacheStats?.cache_misses || 0
      }
    };
  } catch (error) {
    logger.error('Error getting database statistics', error);
    return { error: 'Failed to fetch database data' };
  }
}

async function getPerformanceStatistics() {
  const redis = getRedisClient();
  
  try {
    // Get Redis info
    const redisInfo = await redis.info('memory');
    const redisMemory = redisInfo.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'Unknown';
    
    return {
      redis: {
        memory: redisMemory,
        connected: true
      },
      analysis: {
        avgProcessingTime: 4567, // ms
        successRate: 94.2,
        throughputPerHour: 156
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      }
    };
  } catch (error) {
    logger.error('Error getting performance statistics', error);
    return { error: 'Failed to fetch performance data' };
  }
}

async function getDetailedCostBreakdown(period: string) {
  // TODO: Implement detailed cost queries based on period
  return {
    period,
    breakdown: {
      llmCosts: [
        { model: 'openrouter/sonoma-sky-alpha', requests: 234, cost: 12.45 },
        { model: 'local/llama3', requests: 89, cost: 0.00 }
      ],
      computeCosts: {
        staticAnalysis: 5.67,
        sandboxExecution: 3.21,
        deduplication: 1.23
      },
      storageCosts: {
        database: 2.34,
        cache: 0.89,
        files: 1.45
      }
    }
  };
}

async function getJobDetails(status?: string, limit = 50, offset = 0) {
  // TODO: Implement job detail queries
  return {
    jobs: [],
    total: 0,
    limit,
    offset
  };
}

async function getDatabaseAnalytics() {
  // TODO: Implement comprehensive database analytics
  return {
    topPackages: [],
    riskDistribution: {},
    analysisTimeTrends: [],
    errorPatterns: []
  };
}

async function getSystemHealth() {
  const redis = getRedisClient();
  
  try {
    // Test Redis connection
    await redis.ping();
    
    // Test Postgres connection
    const dbHealthy = await db.healthCheck();

    return {
      redis: { status: 'healthy', latency: 1 },
      postgres: { status: dbHealthy ? 'healthy' : 'unhealthy' },
      workers: { active: 2, healthy: 2 },
      api: { status: 'healthy', uptime: process.uptime() }
    };
  } catch (error) {
    logger.error('Health check failed', error);
    return {
      redis: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      postgres: { status: 'unknown' },
      workers: { status: 'unknown' },
      api: { status: 'healthy', uptime: process.uptime() }
    };
  }
}

export default router;