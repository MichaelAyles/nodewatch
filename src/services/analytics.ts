import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Analytics Service for NodeWatch
 * 
 * This service handles internal analytics and metrics collection.
 * 
 * PostHog vs Custom Analytics Decision:
 * 
 * ✅ Custom Analytics (Current Approach) - RECOMMENDED
 * - Perfect for operational metrics (costs, performance, system health)
 * - Full control over data and privacy
 * - No external dependencies or costs
 * - Integrates directly with your Convex database
 * - Real-time dashboard capabilities
 * - No data leaves your infrastructure
 * 
 * 🤔 PostHog - Consider for User Analytics Only
 * - Great for user behavior tracking (if you have external users)
 * - Product analytics and A/B testing
 * - User journey analysis
 * - But NOT suitable for operational/cost metrics
 * - Adds external dependency and costs
 * - Privacy considerations for user data
 * 
 * RECOMMENDATION: 
 * Stick with custom analytics for operational metrics (costs, performance, system health).
 * Only consider PostHog if you plan to have external users and need user behavior analytics.
 */

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush events to database every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  // Track operational events (costs, performance, errors)
  trackOperationalEvent(event: string, properties: Record<string, any>) {
    this.addEvent({
      event: `operational.${event}`,
      properties: {
        ...properties,
        environment: config.nodeEnv,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  // Track analysis events
  trackAnalysisEvent(event: string, properties: Record<string, any>) {
    this.addEvent({
      event: `analysis.${event}`,
      properties: {
        ...properties,
        environment: config.nodeEnv,
      },
      timestamp: Date.now(),
    });
  }

  // Track cost events
  trackCostEvent(event: string, properties: Record<string, any>) {
    this.addEvent({
      event: `cost.${event}`,
      properties: {
        ...properties,
        environment: config.nodeEnv,
      },
      timestamp: Date.now(),
    });
  }

  // Track system performance events
  trackPerformanceEvent(event: string, properties: Record<string, any>) {
    this.addEvent({
      event: `performance.${event}`,
      properties: {
        ...properties,
        environment: config.nodeEnv,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
      timestamp: Date.now(),
    });
  }

  private addEvent(event: AnalyticsEvent) {
    this.events.push(event);
    
    // Flush immediately if buffer is getting large
    if (this.events.length >= 100) {
      this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      // TODO: Store events in Convex database
      // await convexClient.mutation(api.analytics.batchInsert, { events: eventsToFlush });
      
      logger.debug(`Flushed ${eventsToFlush.length} analytics events`);
    } catch (error) {
      logger.error('Failed to flush analytics events', error);
      // Put events back in buffer for retry
      this.events.unshift(...eventsToFlush);
    }
  }

  async getEventCounts(timeRange: string = '24h'): Promise<Record<string, number>> {
    try {
      // TODO: Query Convex for event counts
      // const counts = await convexClient.query(api.analytics.getEventCounts, { timeRange });
      
      // Mock data for now
      return {
        'analysis.started': 156,
        'analysis.completed': 142,
        'analysis.failed': 14,
        'cost.llm_request': 89,
        'cost.budget_alert': 2,
        'performance.high_memory': 5,
        'operational.queue_full': 1,
      };
    } catch (error) {
      logger.error('Failed to get event counts', error);
      return {};
    }
  }

  async getPerformanceMetrics(timeRange: string = '24h'): Promise<any> {
    try {
      // TODO: Query Convex for performance metrics
      return {
        avgAnalysisTime: 4567,
        successRate: 94.2,
        errorRate: 5.8,
        throughput: 156,
        memoryUsage: {
          avg: 245,
          max: 512,
          min: 128,
        },
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', error);
      return {};
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining events
    this.flushEvents();
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// Helper functions for common tracking patterns
export const trackAnalysisStarted = (packageName: string, version: string, jobId: string) => {
  analytics.trackAnalysisEvent('started', {
    packageName,
    version,
    jobId,
  });
};

export const trackAnalysisCompleted = (packageName: string, version: string, jobId: string, duration: number, score: number) => {
  analytics.trackAnalysisEvent('completed', {
    packageName,
    version,
    jobId,
    duration,
    score,
  });
};

export const trackAnalysisFailed = (packageName: string, version: string, jobId: string, error: string) => {
  analytics.trackAnalysisEvent('failed', {
    packageName,
    version,
    jobId,
    error,
  });
};

export const trackCostIncurred = (type: string, amount: number, provider: string) => {
  analytics.trackCostEvent('incurred', {
    type,
    amount,
    provider,
  });
};

export const trackBudgetAlert = (type: string, current: number, threshold: number) => {
  analytics.trackCostEvent('budget_alert', {
    alertType: type,
    currentAmount: current,
    threshold,
  });
};