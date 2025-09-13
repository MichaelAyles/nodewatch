import { Worker } from 'bullmq';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, closeRedisConnection } from './utils/redis';
import { AnalysisPipelineWithDB } from './pipeline-with-db';

const QUEUE_NAME = 'analysis-queue';

class AnalysisWorker {
  private worker: Worker;
  private pipeline: AnalysisPipelineWithDB;

  constructor() {
    this.pipeline = new AnalysisPipelineWithDB();
    
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        return await this.processAnalysisJob(job);
      },
      {
        connection: getRedisClient(),
        concurrency: config.analysis.maxConcurrent,
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 50 },       // Keep last 50 failed jobs
      }
    );

    this.setupEventHandlers();
  }

  private async processAnalysisJob(job: any) {
    const { packageName, version, priority } = job.data;
    
    logger.info(`Processing analysis job`, {
      jobId: job.id,
      package: `${packageName}@${version}`,
      priority,
    });

    try {
      const result = await this.pipeline.analyzePackage(packageName, version);
      
      logger.info(`Analysis job completed`, {
        jobId: job.id,
        package: `${packageName}@${version}`,
        score: result.overall_score,
        riskLevel: result.risk_level,
      });

      return result;
    } catch (error) {
      logger.error(`Analysis job failed`, {
        jobId: job.id,
        package: `${packageName}@${version}`,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  private setupEventHandlers() {
    this.worker.on('ready', () => {
      logger.info('Analysis worker ready');
    });

    this.worker.on('error', (error) => {
      logger.error('Worker error', error);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job failed`, {
        jobId: job?.id,
        error: error.message,
      });
    });

    this.worker.on('completed', (job) => {
      logger.debug(`Job completed`, {
        jobId: job.id,
        duration: Date.now() - job.processedOn!,
      });
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job stalled`, { jobId });
    });
  }

  async start() {
    logger.info('Starting analysis worker');
    // Worker starts automatically when created
  }

  async stop() {
    logger.info('Stopping analysis worker');
    await this.worker.close();
    await closeRedisConnection();
  }
}

// Graceful shutdown
async function shutdown(worker: AnalysisWorker) {
  logger.info('Shutting down worker gracefully');
  await worker.stop();
  process.exit(0);
}

// Start worker
async function startWorker() {
  const worker = new AnalysisWorker();
  
  process.on('SIGTERM', () => shutdown(worker));
  process.on('SIGINT', () => shutdown(worker));
  
  await worker.start();
  
  logger.info('Analysis worker started successfully');
}

// Only start worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Failed to start worker', error);
    process.exit(1);
  });
}

export { AnalysisWorker };