import { convexClient } from '../convex-client';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface CostEntry {
  type: 'llm' | 'compute' | 'storage';
  provider: string;
  model?: string;
  operation: string;
  cost: number;
  currency: 'USD';
  metadata: {
    tokens?: number;
    requests?: number;
    duration?: number;
    packageName?: string;
    jobId?: string;
  };
  timestamp: number;
}

export class CostTracker {
  private dailyTotal = 0;
  private monthlyTotal = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.loadTotals();
  }

  async trackLLMCost(params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    packageName: string;
    jobId: string;
  }) {
    const cost = this.calculateLLMCost(params.provider, params.model, params.inputTokens, params.outputTokens);
    
    const entry: CostEntry = {
      type: 'llm',
      provider: params.provider,
      model: params.model,
      operation: 'analysis',
      cost,
      currency: 'USD',
      metadata: {
        tokens: params.inputTokens + params.outputTokens,
        requests: 1,
        packageName: params.packageName,
        jobId: params.jobId,
      },
      timestamp: Date.now(),
    };

    await this.recordCost(entry);
    return cost;
  }

  async trackComputeCost(params: {
    operation: 'static_analysis' | 'sandbox_execution' | 'deduplication';
    duration: number;
    packageName: string;
    jobId: string;
  }) {
    const cost = this.calculateComputeCost(params.operation, params.duration);
    
    const entry: CostEntry = {
      type: 'compute',
      provider: 'local',
      operation: params.operation,
      cost,
      currency: 'USD',
      metadata: {
        duration: params.duration,
        packageName: params.packageName,
        jobId: params.jobId,
      },
      timestamp: Date.now(),
    };

    await this.recordCost(entry);
    return cost;
  }

  async trackStorageCost(params: {
    operation: 'database_write' | 'cache_store' | 'file_storage';
    bytes: number;
    packageName?: string;
  }) {
    const cost = this.calculateStorageCost(params.operation, params.bytes);
    
    const entry: CostEntry = {
      type: 'storage',
      provider: 'convex',
      operation: params.operation,
      cost,
      currency: 'USD',
      metadata: {
        packageName: params.packageName,
      },
      timestamp: Date.now(),
    };

    await this.recordCost(entry);
    return cost;
  }

  private calculateLLMCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    // OpenRouter pricing (approximate - you should get actual rates from their API)
    const pricing: Record<string, { input: number; output: number }> = {
      'openrouter/sonoma-sky-alpha': { input: 0.000001, output: 0.000002 }, // $1/1M input, $2/1M output
      'anthropic/claude-3-sonnet': { input: 0.000003, output: 0.000015 },
      'openai/gpt-4': { input: 0.00003, output: 0.00006 },
      'meta-llama/llama-3-8b': { input: 0.0000002, output: 0.0000002 },
    };

    const modelPricing = pricing[model] || pricing['openrouter/sonoma-sky-alpha'];
    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  }

  private calculateComputeCost(operation: string, durationMs: number): number {
    // Rough compute cost estimation based on operation type and duration
    const costPerSecond: Record<string, number> = {
      'static_analysis': 0.0001,    // $0.0001 per second
      'sandbox_execution': 0.0005,  // $0.0005 per second (more expensive due to Docker)
      'deduplication': 0.00005,     // $0.00005 per second
    };

    const rate = costPerSecond[operation] || 0.0001;
    return (durationMs / 1000) * rate;
  }

  private calculateStorageCost(operation: string, bytes: number): number {
    // Rough storage cost estimation
    const costPerMB: Record<string, number> = {
      'database_write': 0.00001,  // $0.00001 per MB
      'cache_store': 0.000005,    // $0.000005 per MB
      'file_storage': 0.000002,   // $0.000002 per MB
    };

    const rate = costPerMB[operation] || 0.00001;
    const mb = bytes / (1024 * 1024);
    return mb * rate;
  }

  private async recordCost(entry: CostEntry) {
    try {
      // Store in database
      // TODO: Replace with actual Convex mutation once generated
      // await convexClient.mutation(api.costs.record, entry);

      // Update running totals
      this.dailyTotal += entry.cost;
      this.monthlyTotal += entry.cost;

      // Check for budget alerts
      await this.checkBudgetAlerts();

      logger.debug('Cost recorded', {
        type: entry.type,
        provider: entry.provider,
        operation: entry.operation,
        cost: entry.cost,
        dailyTotal: this.dailyTotal,
      });
    } catch (error) {
      logger.error('Failed to record cost', error);
    }
  }

  private async checkBudgetAlerts() {
    const dailyBudget = config.costTracking.dailyBudgetUsd;
    const alertThreshold = config.costTracking.alertThresholdUsd;

    if (this.dailyTotal > dailyBudget) {
      logger.warn('Daily budget exceeded', {
        dailyTotal: this.dailyTotal,
        dailyBudget,
      });
      
      // TODO: Send alert notification
      await this.sendBudgetAlert('BUDGET_EXCEEDED', {
        current: this.dailyTotal,
        budget: dailyBudget,
      });
    } else if (this.dailyTotal > alertThreshold) {
      logger.warn('Budget alert threshold reached', {
        dailyTotal: this.dailyTotal,
        alertThreshold,
      });
      
      await this.sendBudgetAlert('THRESHOLD_REACHED', {
        current: this.dailyTotal,
        threshold: alertThreshold,
      });
    }
  }

  private async sendBudgetAlert(type: string, data: any) {
    // TODO: Implement alert notifications (email, webhook, etc.)
    logger.warn(`Budget alert: ${type}`, data);
  }

  private async loadTotals() {
    try {
      // TODO: Load current day/month totals from database
      // const today = new Date().toDateString();
      // const thisMonth = new Date().toISOString().slice(0, 7);
      
      // const dailyData = await convexClient.query(api.costs.getDailyTotal, { date: today });
      // const monthlyData = await convexClient.query(api.costs.getMonthlyTotal, { month: thisMonth });
      
      // this.dailyTotal = dailyData?.total || 0;
      // this.monthlyTotal = monthlyData?.total || 0;
    } catch (error) {
      logger.error('Failed to load cost totals', error);
    }
  }

  async getDailyCosts(): Promise<{ total: number; breakdown: Record<string, number> }> {
    try {
      // TODO: Query database for today's costs
      return {
        total: this.dailyTotal,
        breakdown: {
          llm: this.dailyTotal * 0.7,
          compute: this.dailyTotal * 0.25,
          storage: this.dailyTotal * 0.05,
        }
      };
    } catch (error) {
      logger.error('Failed to get daily costs', error);
      return { total: 0, breakdown: {} };
    }
  }

  async getMonthlyCosts(): Promise<{ total: number; breakdown: Record<string, number> }> {
    try {
      // TODO: Query database for this month's costs
      return {
        total: this.monthlyTotal,
        breakdown: {
          llm: this.monthlyTotal * 0.7,
          compute: this.monthlyTotal * 0.25,
          storage: this.monthlyTotal * 0.05,
        }
      };
    } catch (error) {
      logger.error('Failed to get monthly costs', error);
      return { total: 0, breakdown: {} };
    }
  }

  async getCostTrends(days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    try {
      // TODO: Query database for cost trends
      return [];
    } catch (error) {
      logger.error('Failed to get cost trends', error);
      return [];
    }
  }

  getBudgetStatus() {
    const dailyBudget = config.costTracking.dailyBudgetUsd;
    const alertThreshold = config.costTracking.alertThresholdUsd;

    return {
      dailyTotal: this.dailyTotal,
      dailyBudget,
      dailyRemaining: Math.max(0, dailyBudget - this.dailyTotal),
      dailyUsagePercent: (this.dailyTotal / dailyBudget) * 100,
      alertThreshold,
      isOverBudget: this.dailyTotal > dailyBudget,
      isNearThreshold: this.dailyTotal > alertThreshold,
    };
  }
}

// Singleton instance
export const costTracker = new CostTracker();