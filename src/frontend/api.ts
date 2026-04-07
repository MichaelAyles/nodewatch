// API client for NodeWatch backend

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface AnalyzeResponse {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
  statusUrl: string;
  resultUrl: string;
}

export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  status: string;
  progress: number | Record<string, any>;
  data: {
    packageName: string;
    version: string;
    priority: number;
    requestedAt: number;
  };
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
  failedReason?: string;
}

export interface JobResultResponse {
  success: boolean;
  jobId: string;
  status: string;
  result?: AnalysisResult;
  completedAt?: number;
  processingTime?: number;
  progress?: number;
  message?: string;
  error?: string;
}

export interface AnalysisResult {
  package: {
    name: string;
    version: string;
    description?: string;
  };
  static_analysis: {
    suspiciousPatterns?: SuspiciousPattern[];
    suspicious_patterns?: SuspiciousPattern[];
    riskIndicators?: RiskIndicators;
    risk_indicators?: RiskIndicators;
    obfuscationScore?: number;
    obfuscation_score?: number;
    typosquattingScore?: number;
    typosquatting_score?: number;
    integrityFlags?: string[];
    integrity_flags?: string[];
    score: number;
    confidence?: number;
  };
  llm_analysis?: {
    verdict: string;
    confidence: number;
    reasoning: string[];
    specificThreats?: ThreatIndicator[];
    specific_threats?: ThreatIndicator[];
    recommendedActions?: string[];
    recommended_actions?: string[];
    score: number;
    provider?: string;
    tokensUsed?: number;
    costUSD?: number;
  };
  overall_score: number;
  risk_level: string;
  timestamp: number;
}

export interface SuspiciousPattern {
  type: string;
  file: string;
  line: number;
  snippet: string;
  severity: string;
  description: string;
  confidence: number;
}

export interface RiskIndicators {
  uses_eval?: boolean;
  uses_dynamic_require?: boolean;
  makes_network_calls?: boolean;
  accesses_filesystem?: boolean;
  has_obfuscated_code?: boolean;
  has_base64_strings?: boolean;
  modifies_prototype?: boolean;
}

export interface ThreatIndicator {
  type: string;
  severity: string;
  description: string;
  evidence: string[];
}

export interface StatsResponse {
  success: boolean;
  stats: {
    totalPackagesAnalyzed: number;
    malwareDetected: number;
    currentlyAnalyzing: number;
    queueDepth: number;
    analysisRate: number;
    packagesAnalyzedToday: number;
    recentMalwareCount: number;
    successRate: number;
    cacheHitRate: number;
  };
}

export interface QueueStatsResponse {
  success: boolean;
  stats: {
    bullmq: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      total: number;
    };
    currentlyAnalyzing: number;
    queueDepth: number;
    totalProcessed: number;
    failureRate: number;
  };
}

export interface HealthMetricsResponse {
  success: boolean;
  metrics: {
    safePackagePercentage: number;
    threatDetectionRate: number;
    analysisCoverage: number;
    averageRiskScore: number;
    totalPackages: number;
    totalAnalyzed: number;
    totalThreats: number;
  };
}

export interface RecentPackagesResponse {
  success: boolean;
  packages: {
    name: string;
    version: string;
    weeklyDownloads: number;
    riskScore: number;
    riskLevel: string;
    analysisStatus: string;
    lastAnalyzed?: string;
    shortDescription: string;
    maintainer: string;
  }[];
}

export const api = {
  analyze(name: string, version?: string): Promise<AnalyzeResponse> {
    return request(`${BASE}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ name, version: version || undefined }),
    });
  },

  getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return request(`${BASE}/job/${jobId}/status`);
  },

  getJobResult(jobId: string): Promise<JobResultResponse> {
    return request(`${BASE}/job/${jobId}/result`);
  },

  getStats(): Promise<StatsResponse> {
    return request(`${BASE}/stats`);
  },

  getQueueStats(): Promise<QueueStatsResponse> {
    return request(`${BASE}/queue/stats`);
  },

  getHealthMetrics(): Promise<HealthMetricsResponse> {
    return request(`${BASE}/health/metrics`);
  },

  getRecentPackages(): Promise<RecentPackagesResponse> {
    return request(`${BASE}/packages/top?limit=10`);
  },
};
