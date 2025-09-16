import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { browserLogger as logger } from './browser-logger';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  stale?: boolean;
  timestamp?: number;
}

export interface SystemStats {
  totalPackagesAnalyzed: number;
  malwareDetected: number;
  currentlyAnalyzing: number;
  queueDepth: number;
  analysisRate: number;
  packagesAnalyzedToday: number;
  recentMalwareCount: number;
  successRate: number;
  cacheHitRate: number;
  lastScanTime: number;
  completedPackages: number;
  failedPackages: number;
  pendingPackages: number;
}

export interface HealthMetrics {
  safePackagePercentage: number;
  threatDetectionRate: number;
  analysisCoverage: number;
  averageRiskScore: number;
  weeklyChange: {
    safePackages: number;
    threatsDetected: number;
    newPackagesAnalyzed: number;
  };
  totalPackages: number;
  totalAnalyzed: number;
  totalThreats: number;
  recentActivity: {
    packagesThisWeek: number;
    threatsThisWeek: number;
    analysesThisWeek: number;
  };
}

export interface RecentActivity {
  recentPackages: Array<{
    id: string;
    name: string;
    version: string;
    status: string;
    createdAt: number;
  }>;
  recentAnalyses: Array<{
    id: string;
    packageId: string;
    stage: string;
    completedAt: number;
    processingTime: number;
    cacheHit: boolean;
  }>;
  recentThreats: Array<{
    id: string;
    packageId: string;
    overallScore: number;
    riskSignals: string[];
    calculatedAt: number;
  }>;
}

export interface QueueStats {
  bullmq: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  convex: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
    avgProcessingTimeMs: number;
    estimatedQueueTimeMs: number;
  };
  currentlyAnalyzing: number;
  queueDepth: number;
  totalProcessed: number;
  failureRate: number;
  timestamp: number;
}

export interface CacheStatus {
  name: string;
  key: string;
  exists: boolean;
}

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error(`API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  private async handleResponse<T>(response: AxiosResponse): Promise<ApiResponse<T>> {
    if (response.data.success) {
      return {
        success: true,
        data: response.data.stats || response.data.metrics || response.data.activity || response.data,
        cached: response.data.cached,
        stale: response.data.stale,
        timestamp: response.data.timestamp,
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Unknown error',
      };
    }
  }

  private async handleError(error: any): Promise<ApiResponse<any>> {
    const message = error.response?.data?.error || error.message || 'Network error';
    logger.error('API call failed:', message);
    
    return {
      success: false,
      error: message,
    };
  }

  // System Statistics
  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    try {
      const response = await this.client.get('/api/stats');
      return this.handleResponse<SystemStats>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Health Metrics
  async getHealthMetrics(): Promise<ApiResponse<HealthMetrics>> {
    try {
      const response = await this.client.get('/api/health/metrics');
      return this.handleResponse<HealthMetrics>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Recent Activity
  async getRecentActivity(hours: number = 24): Promise<ApiResponse<RecentActivity>> {
    try {
      const response = await this.client.get(`/api/stats/activity?hours=${hours}`);
      return this.handleResponse<RecentActivity>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Queue Statistics
  async getQueueStats(): Promise<ApiResponse<QueueStats>> {
    try {
      const response = await this.client.get('/api/queue/stats');
      return this.handleResponse<QueueStats>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Cache Management
  async invalidateCache(keys: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/cache/invalidate', { keys });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async clearAllCache(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/cache/clear-all');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCacheStatus(): Promise<ApiResponse<CacheStatus[]>> {
    try {
      const response = await this.client.get('/api/cache/status');
      return this.handleResponse<CacheStatus[]>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    try {
      const response = await this.client.get('/health');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Singleton instance for global use
let globalApiClient: ApiClient | null = null;

export function getApiClient(baseURL?: string): ApiClient {
  if (!globalApiClient) {
    globalApiClient = new ApiClient(baseURL);
  }
  return globalApiClient;
}

// React hook for API client
export function useApiClient() {
  return getApiClient();
}