import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Queue } from 'bullmq';
import { db } from './database/postgres-client';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, closeRedisConnection, redisCache } from './utils/redis';
import adminDashboard from './admin/dashboard';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = config.port;

// Job queue for analysis tasks
const analysisQueue = new Queue('analysis-queue', {
  connection: getRedisClient(),
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  
  socket.on('subscribe-stats', () => {
    socket.join('stats-updates');
    logger.info(`Client ${socket.id} subscribed to stats updates`);
  });
  
  socket.on('unsubscribe-stats', () => {
    socket.leave('stats-updates');
    logger.info(`Client ${socket.id} unsubscribed from stats updates`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Function to broadcast stats updates
function broadcastStatsUpdate(stats: any) {
  io.to('stats-updates').emit('stats-update', stats);
}

// Cache configuration
const CACHE_KEYS = {
  SYSTEM_STATS: 'system:stats',
  HEALTH_METRICS: 'system:health',
  RECENT_ACTIVITY: 'system:activity',
  RECENT_FINDINGS: 'system:findings',
  TOP_PACKAGES: 'system:top-packages',
  QUEUE_STATS: 'system:queue-stats',
} as const;

const CACHE_TTL = {
  SYSTEM_STATS: 30, // 30 seconds for real-time stats
  HEALTH_METRICS: 300, // 5 minutes for health metrics
  RECENT_ACTIVITY: 60, // 1 minute for activity
  RECENT_FINDINGS: 120, // 2 minutes for findings
  TOP_PACKAGES: 600, // 10 minutes for top packages
  QUEUE_STATS: 15, // 15 seconds for queue stats
} as const;

// CORS configuration for production
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Frontend is served from the same origin, so allow all origins.
    // When a domain is configured, this can be locked down.
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

// Admin dashboard routes
if (config.admin.enabled) {
  app.use('/admin', adminDashboard);
  
  // Serve admin dashboard HTML
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Queue a package for analysis (non-blocking)
app.post('/api/analyze', async (req, res) => {
  const { name, version, priority } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Package name is required' });
  }

  try {
    logger.apiRequest('POST', '/api/analyze', req.ip);
    
    // Add job to queue instead of processing directly
    const job = await analysisQueue.add('analyze-package', {
      packageName: name,
      version: version || 'latest',
      priority: priority || 1,
      requestedBy: req.ip,
      requestedAt: Date.now(),
    }, {
      priority: priority || 1,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    logger.queueJob(job.id!, `${name}@${version || 'latest'}`);
    
    res.json({
      success: true,
      jobId: job.id,
      status: 'queued',
      message: `Analysis queued for ${name}@${version || 'latest'}`,
      statusUrl: `/api/job/${job.id}/status`,
      resultUrl: `/api/job/${job.id}/result`
    });
  } catch (error: any) {
    logger.apiError('POST', '/api/analyze', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to queue analysis'
    });
  }
});

// Get job status
app.get('/api/job/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await analysisQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress;
    
    res.json({
      success: true,
      jobId: job.id,
      status: state,
      progress: progress || 0,
      data: job.data,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
      failedReason: job.failedReason,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job result
app.get('/api/job/:jobId/result', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await analysisQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const state = await job.getState();
    
    if (state === 'completed') {
      res.json({
        success: true,
        jobId: job.id,
        status: 'completed',
        result: job.returnvalue,
        completedAt: job.finishedOn,
        processingTime: job.finishedOn! - job.processedOn!,
      });
    } else if (state === 'failed') {
      res.status(500).json({
        success: false,
        jobId: job.id,
        status: 'failed',
        error: job.failedReason,
        failedAt: job.finishedOn,
      });
    } else {
      res.json({
        success: true,
        jobId: job.id,
        status: state,
        progress: job.progress || 0,
        message: 'Analysis still in progress'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get package analysis from database
app.get('/api/package/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const result = await db.getPackageByName(name);
    
    if (result) {
      res.json({
        success: true,
        result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Package not found or not analyzed yet'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List recently analyzed packages
app.get('/api/packages/recent', async (req, res) => {
  try {
    const packages = await db.listPackages({ limit: 20 });
    
    res.json({
      success: true,
      packages
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system statistics for homepage with caching
app.get('/api/stats', async (req, res) => {
  try {
    logger.apiRequest('GET', '/api/stats', req.ip);
    
    // Try to get from cache first
    const cachedStats = await redisCache.get(CACHE_KEYS.SYSTEM_STATS);
    if (cachedStats) {
      return res.json({
        success: true,
        stats: cachedStats,
        cached: true,
        timestamp: Date.now()
      });
    }
    
    // Fetch fresh data from Postgres or use fallback
    let stats;
    try {
      const cacheStats = await db.getCacheStats();
      const packages = await db.listPackages({ limit: 1 });
      stats = {
        totalPackagesAnalyzed: cacheStats?.packages_analyzed || 0,
        malwareDetected: 0,
        currentlyAnalyzing: 0,
        queueDepth: 0,
        analysisRate: 0,
        packagesAnalyzedToday: cacheStats?.packages_analyzed || 0,
        recentMalwareCount: 0,
        successRate: cacheStats?.cache_hits && cacheStats?.cache_misses
          ? Math.round((cacheStats.cache_hits / (cacheStats.cache_hits + cacheStats.cache_misses)) * 100) : 0,
        cacheHitRate: cacheStats?.cache_hits && cacheStats?.cache_misses
          ? Math.round((cacheStats.cache_hits / (cacheStats.cache_hits + cacheStats.cache_misses)) * 100) : 0,
        lastScanTime: Date.now(),
        completedPackages: cacheStats?.packages_analyzed || 0,
        failedPackages: 0,
        pendingPackages: 0,
      };
    } catch (dbError) {
      logger.warn('Failed to fetch stats from Postgres, using fallback', dbError);
      stats = {
        totalPackagesAnalyzed: 0,
        malwareDetected: 0,
        currentlyAnalyzing: 0,
        queueDepth: 0,
        analysisRate: 0,
        packagesAnalyzedToday: 0,
        recentMalwareCount: 0,
        successRate: 0,
        cacheHitRate: 0,
        lastScanTime: Date.now(),
        completedPackages: 0,
        failedPackages: 0,
        pendingPackages: 0,
      };
    }
    
    // Cache the results
    await redisCache.set(CACHE_KEYS.SYSTEM_STATS, stats, CACHE_TTL.SYSTEM_STATS);
    
    // Broadcast to WebSocket clients
    broadcastStatsUpdate(stats);
    
    res.json({
      success: true,
      stats,
      cached: false,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/stats', error, req.ip);
    
    // Try to return stale cached data on error
    const staleStats = await redisCache.get(CACHE_KEYS.SYSTEM_STATS);
    if (staleStats) {
      return res.json({
        success: true,
        stats: staleStats,
        cached: true,
        stale: true,
        timestamp: Date.now()
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent activity with caching
app.get('/api/stats/activity', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    logger.apiRequest('GET', '/api/stats/activity', req.ip);
    
    const cacheKey = `${CACHE_KEYS.RECENT_ACTIVITY}:${hours}`;
    
    // Try to get from cache first
    const cachedActivity = await redisCache.get(cacheKey);
    if (cachedActivity) {
      return res.json({
        success: true,
        activity: cachedActivity,
        cached: true,
        timestamp: Date.now()
      });
    }
    
    // Fetch fresh data from Postgres or use fallback
    let activity;
    try {
      const recentPackages = await db.listPackages({ limit: 10 });
      activity = {
        recentPackages: recentPackages.map((p: any) => ({
          id: p.id,
          name: p.name,
          version: p.version,
          status: p.analysis_status || 'unknown',
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        })),
        recentAnalyses: [],
        recentThreats: [],
      };
    } catch (dbError) {
      logger.warn('Failed to fetch activity from Postgres, using fallback', dbError);
      activity = {
        recentPackages: [],
        recentAnalyses: [],
        recentThreats: [],
      };
    }
    
    // Cache the results
    await redisCache.set(cacheKey, activity, CACHE_TTL.RECENT_ACTIVITY);
    
    res.json({
      success: true,
      activity,
      cached: false,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/stats/activity', error, req.ip);
    
    // Try to return stale cached data on error
    const hours = parseInt(req.query.hours as string) || 24;
    const cacheKey = `${CACHE_KEYS.RECENT_ACTIVITY}:${hours}`;
    const staleActivity = await redisCache.get(cacheKey);
    if (staleActivity) {
      return res.json({
        success: true,
        activity: staleActivity,
        cached: true,
        stale: true,
        timestamp: Date.now()
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get health metrics with caching
app.get('/api/health/metrics', async (req, res) => {
  try {
    logger.apiRequest('GET', '/api/health/metrics', req.ip);
    
    // Try to get from cache first
    const cachedMetrics = await redisCache.get(CACHE_KEYS.HEALTH_METRICS);
    if (cachedMetrics) {
      return res.json({
        success: true,
        metrics: cachedMetrics,
        cached: true,
        timestamp: Date.now()
      });
    }
    
    // Fetch fresh data from Postgres or use fallback
    let metrics;
    try {
      const cacheStats = await db.getCacheStats();
      const dedupStats = await db.getDeduplicationStats();
      const totalPackages = dedupStats?.total_packages || 0;
      const totalAnalyzed = cacheStats?.packages_analyzed || 0;
      metrics = {
        safePackagePercentage: totalAnalyzed > 0 ? 100 : 0,
        threatDetectionRate: 0,
        analysisCoverage: totalPackages > 0 ? Math.round((totalAnalyzed / totalPackages) * 100) : 0,
        averageRiskScore: 0,
        weeklyChange: {
          safePackages: 0,
          threatsDetected: 0,
          newPackagesAnalyzed: 0,
        },
        totalPackages,
        totalAnalyzed,
        totalThreats: 0,
        recentActivity: {
          packagesThisWeek: 0,
          threatsThisWeek: 0,
          analysesThisWeek: 0,
        },
      };
    } catch (dbError) {
      logger.warn('Failed to fetch health metrics from Postgres, using fallback', dbError);
      metrics = {
        safePackagePercentage: 0,
        threatDetectionRate: 0,
        analysisCoverage: 0,
        averageRiskScore: 0,
        weeklyChange: {
          safePackages: 0,
          threatsDetected: 0,
          newPackagesAnalyzed: 0,
        },
        totalPackages: 0,
        totalAnalyzed: 0,
        totalThreats: 0,
        recentActivity: {
          packagesThisWeek: 0,
          threatsThisWeek: 0,
          analysesThisWeek: 0,
        },
      };
    }
    
    // Cache the results
    await redisCache.set(CACHE_KEYS.HEALTH_METRICS, metrics, CACHE_TTL.HEALTH_METRICS);
    
    res.json({
      success: true,
      metrics,
      cached: false,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/health/metrics', error, req.ip);
    
    // Try to return stale cached data on error
    const staleMetrics = await redisCache.get(CACHE_KEYS.HEALTH_METRICS);
    if (staleMetrics) {
      return res.json({
        success: true,
        metrics: staleMetrics,
        cached: true,
        stale: true,
        timestamp: Date.now()
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent security findings
app.get('/api/findings/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    logger.apiRequest('GET', '/api/findings/recent', req.ip);
    
    // TODO: Replace with actual Postgres query for findings
    
    // Mock data for now
    const mockFindings = [
      {
        id: '1',
        packageName: 'malicious-package-v2',
        version: '1.2.3',
        threatType: 'malware',
        severity: 'critical',
        discoveryDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        summary: 'Contains cryptocurrency mining code that runs in background processes',
        impactDescription: 'Unauthorized cryptocurrency mining using system resources',
        affectedDownloads: 15420,
      },
      {
        id: '2',
        packageName: 'fake-lodash',
        version: '4.17.22',
        threatType: 'typosquatting',
        severity: 'high',
        discoveryDate: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        summary: 'Typosquatting attack mimicking popular lodash library',
        impactDescription: 'Steals environment variables and sends them to remote server',
        affectedDownloads: 8934,
      },
      {
        id: '3',
        packageName: 'suspicious-util',
        version: '2.1.0',
        threatType: 'credential_theft',
        severity: 'high',
        discoveryDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        summary: 'Attempts to access and exfiltrate SSH keys and AWS credentials',
        impactDescription: 'Potential unauthorized access to cloud infrastructure',
        affectedDownloads: 3247,
      },
      {
        id: '4',
        packageName: 'backdoor-express',
        version: '1.0.5',
        threatType: 'backdoor',
        severity: 'critical',
        discoveryDate: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
        summary: 'Creates hidden HTTP endpoint for remote code execution',
        impactDescription: 'Allows attackers to execute arbitrary commands on server',
        affectedDownloads: 12678,
      },
    ].slice(0, limit);
    
    res.json({
      success: true,
      findings: mockFindings
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/findings/recent', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top packages
app.get('/api/packages/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    logger.apiRequest('GET', '/api/packages/top', req.ip);
    
    // TODO: Replace with actual Postgres query for top packages
    
    // Mock data for now
    const mockPackages = [
      {
        name: 'lodash',
        version: '4.17.21',
        weeklyDownloads: 45000000,
        riskScore: 15,
        riskLevel: 'safe',
        analysisStatus: 'completed',
        lastAnalyzed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        shortDescription: 'A modern JavaScript utility library delivering modularity, performance & extras.',
        maintainer: 'lodash',
      },
      {
        name: 'react',
        version: '18.2.0',
        weeklyDownloads: 20000000,
        riskScore: 8,
        riskLevel: 'safe',
        analysisStatus: 'completed',
        lastAnalyzed: new Date(Date.now() - 1 * 60 * 60 * 1000),
        shortDescription: 'React is a JavaScript library for building user interfaces.',
        maintainer: 'facebook',
      },
      {
        name: 'express',
        version: '4.18.2',
        weeklyDownloads: 15000000,
        riskScore: 22,
        riskLevel: 'low',
        analysisStatus: 'completed',
        lastAnalyzed: new Date(Date.now() - 3 * 60 * 60 * 1000),
        shortDescription: 'Fast, unopinionated, minimalist web framework for node.',
        maintainer: 'expressjs',
      },
      {
        name: 'axios',
        version: '1.6.0',
        weeklyDownloads: 12000000,
        riskScore: 18,
        riskLevel: 'safe',
        analysisStatus: 'in_progress',
        shortDescription: 'Promise based HTTP client for the browser and node.js',
        maintainer: 'axios',
      },
    ].slice(0, limit);
    
    res.json({
      success: true,
      packages: mockPackages
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/packages/top', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get queue statistics with caching and real-time updates
app.get('/api/queue/stats', async (req, res) => {
  try {
    logger.apiRequest('GET', '/api/queue/stats', req.ip);
    
    // Try to get from cache first
    const cachedQueueStats = await redisCache.get(CACHE_KEYS.QUEUE_STATS);
    if (cachedQueueStats) {
      return res.json({
        success: true,
        stats: cachedQueueStats,
        cached: true,
        timestamp: Date.now()
      });
    }
    
    // Fetch fresh data from both BullMQ and Convex
    const [waiting, active, completed, failed] = await Promise.all([
      analysisQueue.getWaiting(),
      analysisQueue.getActive(),
      analysisQueue.getCompleted(),
      analysisQueue.getFailed()
    ]);
    
    // Get additional queue metrics from Postgres or use fallback
    let dbQueueStats;
    try {
      const cacheStats = await db.getCacheStats();
      dbQueueStats = {
        waiting: 0,
        active: 0,
        completed: cacheStats?.packages_analyzed || 0,
        failed: 0,
        total: cacheStats?.packages_analyzed || 0,
        avgProcessingTimeMs: cacheStats?.avg_processing_time || 0,
        estimatedQueueTimeMs: 0,
      };
    } catch (dbError) {
      logger.warn('Failed to fetch queue stats from Postgres, using fallback', dbError);
      dbQueueStats = {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        avgProcessingTimeMs: 0,
        estimatedQueueTimeMs: 0,
      };
    }

    const queueStats = {
      // BullMQ stats
      bullmq: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      },
      // Database stats
      database: dbQueueStats,
      // Combined metrics
      currentlyAnalyzing: active.length,
      queueDepth: waiting.length,
      totalProcessed: completed.length,
      failureRate: failed.length > 0 ? Math.round((failed.length / (completed.length + failed.length)) * 100) : 0,
      timestamp: Date.now()
    };
    
    // Cache the results
    await redisCache.set(CACHE_KEYS.QUEUE_STATS, queueStats, CACHE_TTL.QUEUE_STATS);
    
    // Broadcast to WebSocket clients
    io.to('stats-updates').emit('queue-update', queueStats);
    
    res.json({
      success: true,
      stats: queueStats,
      cached: false,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/queue/stats', error, req.ip);
    
    // Try to return stale cached data on error
    const staleQueueStats = await redisCache.get(CACHE_KEYS.QUEUE_STATS);
    if (staleQueueStats) {
      return res.json({
        success: true,
        stats: staleQueueStats,
        cached: true,
        stale: true,
        timestamp: Date.now()
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List active jobs
app.get('/api/queue/jobs', async (req, res) => {
  try {
    const { status = 'active', limit = 10 } = req.query;
    
    let jobs;
    switch (status) {
      case 'waiting':
        jobs = await analysisQueue.getWaiting(0, parseInt(limit as string) - 1);
        break;
      case 'active':
        jobs = await analysisQueue.getActive(0, parseInt(limit as string) - 1);
        break;
      case 'completed':
        jobs = await analysisQueue.getCompleted(0, parseInt(limit as string) - 1);
        break;
      case 'failed':
        jobs = await analysisQueue.getFailed(0, parseInt(limit as string) - 1);
        break;
      default:
        jobs = await analysisQueue.getActive(0, parseInt(limit as string) - 1);
    }
    
    const jobData = await Promise.all(jobs.map(async (job) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    })));
    
    res.json({
      success: true,
      jobs: jobData
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cache management endpoints
app.post('/api/cache/invalidate', async (req, res) => {
  try {
    const { keys } = req.body;
    logger.apiRequest('POST', '/api/cache/invalidate', req.ip);
    
    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({
        success: false,
        error: 'Keys array is required'
      });
    }
    
    const results = await Promise.all(
      keys.map(async (key: string) => {
        const deleted = await redisCache.del(key);
        return { key, deleted };
      })
    );
    
    res.json({
      success: true,
      results,
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('POST', '/api/cache/invalidate', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/cache/clear-all', async (req, res) => {
  try {
    logger.apiRequest('POST', '/api/cache/clear-all', req.ip);
    
    const allCacheKeys = Object.values(CACHE_KEYS);
    const results = await Promise.all(
      allCacheKeys.map(async (key) => {
        const deleted = await redisCache.del(key);
        return { key, deleted };
      })
    );
    
    // Also clear activity cache with different hours
    const activityKeys = await redisCache.keys(`${CACHE_KEYS.RECENT_ACTIVITY}:*`);
    const activityResults = await Promise.all(
      activityKeys.map(async (key) => {
        const deleted = await redisCache.del(key);
        return { key, deleted };
      })
    );
    
    res.json({
      success: true,
      results: [...results, ...activityResults],
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('POST', '/api/cache/clear-all', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/cache/status', async (req, res) => {
  try {
    logger.apiRequest('GET', '/api/cache/status', req.ip);
    
    const cacheStatus = await Promise.all(
      Object.entries(CACHE_KEYS).map(async ([name, key]) => {
        const exists = await redisCache.exists(key);
        return { name, key, exists };
      })
    );
    
    // Check activity cache variants
    const activityKeys = await redisCache.keys(`${CACHE_KEYS.RECENT_ACTIVITY}:*`);
    const activityStatus = await Promise.all(
      activityKeys.map(async (key) => {
        const exists = await redisCache.exists(key);
        return { name: 'RECENT_ACTIVITY_VARIANT', key, exists };
      })
    );
    
    res.json({
      success: true,
      cacheStatus: [...cacheStatus, ...activityStatus],
      timestamp: Date.now()
    });
  } catch (error: any) {
    logger.apiError('GET', '/api/cache/status', error, req.ip);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '..', 'dist', 'frontend');
app.use(express.static(frontendPath));

// Serve React app for all non-API routes
app.use((req, res, next) => {
  // Skip API routes and admin routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
    return next();
  }
  
  // Serve React app for all other routes
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Initialize Redis connection
async function initializeServices() {
  try {
    const redis = getRedisClient();
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  // Clear periodic updates
  if (statsUpdateInterval) {
    clearInterval(statsUpdateInterval);
  }
  
  // Close WebSocket connections
  io.close();
  
  // Close Redis connection
  await closeRedisConnection();
  
  // Close HTTP server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Periodic stats update for real-time WebSocket broadcasting
let statsUpdateInterval: NodeJS.Timeout;

async function startPeriodicStatsUpdates() {
  const updateStats = async () => {
    try {
      // Clear cache to force fresh data
      await redisCache.del(CACHE_KEYS.SYSTEM_STATS);
      await redisCache.del(CACHE_KEYS.QUEUE_STATS);
      
      // Fetch fresh stats
      const [systemStats, queueStats] = await Promise.all([
        (async () => {
          try {
            const cacheStats = await db.getCacheStats();
            return {
              totalPackagesAnalyzed: cacheStats?.packages_analyzed || 0,
              malwareDetected: 0,
              currentlyAnalyzing: 0,
              queueDepth: 0,
              analysisRate: 0,
              packagesAnalyzedToday: cacheStats?.packages_analyzed || 0,
              recentMalwareCount: 0,
              successRate: 0,
              cacheHitRate: cacheStats?.cache_hits && cacheStats?.cache_misses
                ? Math.round((cacheStats.cache_hits / (cacheStats.cache_hits + cacheStats.cache_misses)) * 100) : 0,
              lastScanTime: Date.now(),
              completedPackages: cacheStats?.packages_analyzed || 0,
              failedPackages: 0,
              pendingPackages: 0,
            };
          } catch {
            return {
              totalPackagesAnalyzed: 0, malwareDetected: 0, currentlyAnalyzing: 0,
              queueDepth: 0, analysisRate: 0, packagesAnalyzedToday: 0,
              recentMalwareCount: 0, successRate: 0, cacheHitRate: 0,
              lastScanTime: Date.now(), completedPackages: 0, failedPackages: 0, pendingPackages: 0,
            };
          }
        })(),
        (async () => {
          const [waiting, active] = await Promise.all([
            analysisQueue.getWaiting(),
            analysisQueue.getActive()
          ]);
          return {
            currentlyAnalyzing: active.length,
            queueDepth: waiting.length,
            timestamp: Date.now()
          };
        })()
      ]);
      
      // Cache the fresh data
      await Promise.all([
        redisCache.set(CACHE_KEYS.SYSTEM_STATS, systemStats, CACHE_TTL.SYSTEM_STATS),
        redisCache.set(CACHE_KEYS.QUEUE_STATS, queueStats, CACHE_TTL.QUEUE_STATS)
      ]);
      
      // Broadcast to WebSocket clients
      broadcastStatsUpdate(systemStats);
      io.to('stats-updates').emit('queue-update', queueStats);
      
      logger.info('Periodic stats update completed');
    } catch (error) {
      logger.error('Error during periodic stats update:', error);
    }
  };
  
  // Update every 30 seconds
  statsUpdateInterval = setInterval(updateStats, 30000);
  
  // Initial update
  await updateStats();
}

// Start server
async function startServer() {
  await initializeServices();
  
  server.listen(port, () => {
    logger.info(`NodeWatch server running at http://localhost:${port}`);
    logger.info(`WebSocket server enabled for real-time updates`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Log level: ${config.logLevel}`);
  });
  
  // Start periodic stats updates
  await startPeriodicStatsUpdates();
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export default app;