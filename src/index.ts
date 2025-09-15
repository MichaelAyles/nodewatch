import express from 'express';
import cors from 'cors';
import path from 'path';
import { Queue } from 'bullmq';
import { convexClient } from './convex-client';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, closeRedisConnection } from './utils/redis';
import adminDashboard from './admin/dashboard';

const app = express();
const port = config.port;

// Job queue for analysis tasks
const analysisQueue = new Queue('analysis-queue', {
  connection: getRedisClient(),
});

app.use(cors());
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
    // TODO: Replace with proper Convex API call once generated
    const result = null; // await convexClient.query(api.analysis.getPackageByName, { name });
    
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
    // TODO: Replace with proper Convex API call once generated
    const packages: any[] = []; // await convexClient.query(api.packages.listPackages, { limit: 20 });
    
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

// Get queue statistics
app.get('/api/queue/stats', async (req, res) => {
  try {
    const waiting = await analysisQueue.getWaiting();
    const active = await analysisQueue.getActive();
    const completed = await analysisQueue.getCompleted();
    const failed = await analysisQueue.getFailed();
    
    res.json({
      success: true,
      stats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      }
    });
  } catch (error: any) {
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

// Simple frontend
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NodeWatch - NPM Package Security Scanner</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        input, button {
          padding: 10px;
          margin: 10px 5px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }
        input { width: 300px; }
        button {
          background: #007bff;
          color: white;
          cursor: pointer;
          padding: 10px 20px;
        }
        button:hover { background: #0056b3; }
        #results {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 5px;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          max-height: 500px;
          overflow-y: auto;
        }
        .loading { color: #007bff; }
        .error { color: #dc3545; }
        .safe { color: #28a745; }
        .low { color: #17a2b8; }
        .medium { color: #ffc107; }
        .high { color: #fd7e14; }
        .critical { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔍 NodeWatch</h1>
        <p>Analyze NPM packages for potential security risks</p>
        
        <div>
          <input type="text" id="packageName" placeholder="Enter package name (e.g., lodash)" />
          <input type="text" id="version" placeholder="Version (optional)" />
          <button onclick="analyzePackage()">Analyze</button>
        </div>
        
        <div id="results"></div>
      </div>

      <script>
        let currentJobId = null;
        let pollInterval = null;
        
        async function analyzePackage() {
          const packageName = document.getElementById('packageName').value;
          const version = document.getElementById('version').value;
          const resultsDiv = document.getElementById('results');
          
          if (!packageName) {
            resultsDiv.innerHTML = '<span class="error">Please enter a package name</span>';
            return;
          }
          
          // Clear any existing polling
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          
          resultsDiv.innerHTML = '<span class="loading">Queuing analysis for ' + packageName + '...</span>';
          
          try {
            // Submit job to queue
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: packageName, version })
            });
            
            const data = await response.json();
            
            if (data.success) {
              currentJobId = data.jobId;
              resultsDiv.innerHTML = 
                '<h3>Analysis Queued</h3>' +
                '<strong>Job ID:</strong> ' + data.jobId + '\\n' +
                '<strong>Status:</strong> <span class="loading">Queued</span>\\n' +
                '<strong>Progress:</strong> <span id="progress">0%</span>\\n\\n' +
                '<div id="progressBar" style="width: 100%; background: #f0f0f0; border-radius: 5px;">' +
                '<div id="progressFill" style="width: 0%; background: #007bff; height: 20px; border-radius: 5px; transition: width 0.3s;"></div>' +
                '</div>';
              
              // Start polling for status
              pollJobStatus(data.jobId);
            } else {
              resultsDiv.innerHTML = '<span class="error">Error: ' + data.error + '</span>';
            }
          } catch (error) {
            resultsDiv.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
          }
        }
        
        async function pollJobStatus(jobId) {
          pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch('/api/job/' + jobId + '/status');
              const statusData = await statusResponse.json();
              
              if (statusData.success) {
                const progress = statusData.progress || 0;
                const status = statusData.status;
                
                // Update progress display
                document.getElementById('progress').textContent = progress + '%';
                document.getElementById('progressFill').style.width = progress + '%';
                
                if (status === 'completed') {
                  clearInterval(pollInterval);
                  await fetchJobResult(jobId);
                } else if (status === 'failed') {
                  clearInterval(pollInterval);
                  document.getElementById('results').innerHTML = 
                    '<span class="error">Analysis failed: ' + (statusData.failedReason || 'Unknown error') + '</span>';
                } else {
                  // Update status text
                  const statusElement = document.querySelector('#results .loading');
                  if (statusElement) {
                    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    statusElement.className = status === 'active' ? 'loading' : 'info';
                  }
                }
              }
            } catch (error) {
              console.error('Error polling job status:', error);
            }
          }, 1000); // Poll every second
        }
        
        async function fetchJobResult(jobId) {
          try {
            const resultResponse = await fetch('/api/job/' + jobId + '/result');
            const resultData = await resultResponse.json();
            
            if (resultData.success && resultData.result) {
              const result = resultData.result;
              const riskClass = result.risk_level || 'unknown';
              
              document.getElementById('results').innerHTML = 
                '<h3>Analysis Complete</h3>' +
                '<strong>Job ID:</strong> ' + jobId + '\\n' +
                '<strong>Package:</strong> ' + (result.metadata?.name || 'Unknown') + '@' + (result.metadata?.version || 'Unknown') + '\\n' +
                '<strong>Risk Level:</strong> <span class="' + riskClass + '">' + (result.riskLevel || 'UNKNOWN').toUpperCase() + '</span>\\n' +
                '<strong>Score:</strong> ' + (result.overallScore || 0) + '/100\\n' +
                '<strong>Processing Time:</strong> ' + (resultData.processingTime || 0) + 'ms\\n' +
                '<strong>Cache Hit:</strong> ' + (result.cacheHit ? 'Yes' : 'No') + '\\n\\n' +
                '<strong>Static Analysis:</strong>\\n' +
                JSON.stringify(result.stages?.static || {}, null, 2) + '\\n\\n' +
                '<strong>AI Analysis:</strong>\\n' +
                JSON.stringify(result.stages?.llm || {}, null, 2);
            } else {
              document.getElementById('results').innerHTML = 
                '<span class="error">Error fetching results: ' + (resultData.error || 'Unknown error') + '</span>';
            }
          } catch (error) {
            document.getElementById('results').innerHTML = 
              '<span class="error">Error fetching results: ' + error.message + '</span>';
          }
        }
      </script>
    </body>
    </html>
  `);
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
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeRedisConnection();
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(port, () => {
    logger.info(`NodeWatch server running at http://localhost:${port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Log level: ${config.logLevel}`);
  });
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export default app;