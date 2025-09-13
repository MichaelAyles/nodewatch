// Enhanced TypeScript interfaces for the npm malware detection system

export interface PackageSpec {
  name: string;
  version: string;
  priority: number;
}

export interface AnalysisResult {
  packageId: string;
  overallScore: number;
  riskLevel: RiskLevel;
  stages: {
    static: StaticAnalysisResult;
    dynamic?: DynamicAnalysisResult;
    llm?: LLMAnalysisResult;
  };
  metadata: PackageMetadata;
  processingTime: number;
  cacheHit: boolean;
}

export interface BatchResult {
  batchId: string;
  totalPackages: number;
  completedPackages: number;
  failedPackages: number;
  results: AnalysisResult[];
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AnalysisStatus {
  packageId: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  currentStage?: 'static' | 'dynamic' | 'llm' | 'scoring';
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  error?: string;
}

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'low' | 'medium' | 'high';
export type PatternType = 'eval' | 'dynamic_require' | 'network_call' | 'file_operation' | 'obfuscation' | 'prototype_pollution';

export interface StaticAnalysisResult {
  suspiciousPatterns: SuspiciousPattern[];
  riskIndicators: RiskIndicators;
  obfuscationScore: number;
  typosquattingScore: number;
  integrityFlags: string[];
  score: number;
  confidence: number;
}

export interface SuspiciousPattern {
  type: PatternType;
  file: string;
  line: number;
  snippet: string;
  severity: Severity;
  description: string;
  confidence: number;
}

export interface RiskIndicators {
  uses_eval: boolean;
  uses_dynamic_require: boolean;
  makes_network_calls: boolean;
  accesses_filesystem: boolean;
  has_obfuscated_code: boolean;
  has_base64_strings: boolean;
  modifies_prototype: boolean;
}

export interface DynamicAnalysisResult {
  behaviors: DetectedBehavior[];
  networkActivity: NetworkEvent[];
  fileOperations: FileOperation[];
  processSpawns: ProcessEvent[];
  resourceUsage: ResourceMetrics;
  score: number;
  suspiciousActivities: string[];
}

export interface DetectedBehavior {
  type: string;
  timestamp: number;
  details: any;
  riskLevel: string;
}

export interface NetworkEvent {
  type: string;
  destination: string;
  port?: number;
  protocol: string;
  blocked: boolean;
  timestamp: number;
}

export interface FileOperation {
  operation: string;
  path: string;
  success: boolean;
  timestamp: number;
}

export interface ProcessEvent {
  command: string;
  args: string[];
  exitCode?: number;
  timestamp: number;
}

export interface ResourceMetrics {
  maxMemoryMB: number;
  cpuTimeMs: number;
  diskWritesMB: number;
  networkBytesSent: number;
}

export interface LLMAnalysisResult {
  verdict: 'benign' | 'suspicious' | 'malicious';
  confidence: number;
  reasoning: string[];
  specificThreats: ThreatIndicator[];
  recommendedActions: string[];
  score: number;
  provider: string;
  tokensUsed: number;
  costUSD: number;
}

export interface ThreatIndicator {
  type: string;
  severity: Severity;
  description: string;
  evidence: string[];
}

export interface EvidenceBundle {
  suspiciousSnippets: CodeSnippet[];
  deobfuscatedStrings: string[];
  behaviorSummary: BehaviorSummary;
  metadataAnomalies: MetadataAnomaly[];
  contextualInfo: ContextInfo;
}

export interface CodeSnippet {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  reason: string;
}

export interface BehaviorSummary {
  networkCalls: number;
  fileWrites: number;
  processSpawns: number;
  suspiciousPatterns: string[];
}

export interface MetadataAnomaly {
  type: string;
  description: string;
  severity: Severity;
}

export interface ContextInfo {
  packageName: string;
  version: string;
  maintainer: string;
  downloadCount: number;
  dependencyCount: number;
}

export interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  maintainer?: MaintainerInfo;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  downloadCount?: number;
  publishDate?: number;
  lastModified?: number;
}

export interface MaintainerInfo {
  username: string;
  email?: string;
  twoFactorAuth: boolean;
  accountAge: number;
}

export interface SandboxConfig {
  timeoutMs: number;
  memoryLimitMB: number;
  networkPolicy: 'blocked' | 'monitored' | 'allowed';
  filesystemPolicy: 'readonly' | 'isolated' | 'monitored';
  environmentVariables: Record<string, string>;
}

export interface CachedResult {
  hash: string;
  result: AnalysisResult;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface DeduplicationStats {
  totalFiles: number;
  uniqueFiles: number;
  cacheHitRate: number;
  spaceSavedMB: number;
}

export interface JobOptions {
  priority: number;
  retryAttempts: number;
  timeoutMs: number;
  notificationWebhook?: string;
}

export interface BatchOptions extends JobOptions {
  batchSize: number;
  concurrency: number;
}

export interface JobStatus {
  id: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: any;
  result?: any;
  error?: string;
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FileContent {
  path: string;
  content: string;
  hash: string;
  size: number;
}

export interface ObfuscationResult {
  isObfuscated: boolean;
  confidence: number;
  techniques: string[];
  deobfuscatedContent?: string;
}

export interface TyposquattingResult {
  isTyposquat: boolean;
  similarity: number;
  targetPackage?: string;
  confidence: number;
}

export interface IntegrityResult {
  isValid: boolean;
  mismatches: string[];
  confidence: number;
}

export type LLMProvider = 'openai' | 'anthropic' | 'local';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface SystemMetrics {
  analysisLatency: number;
  cacheHitRate: number;
  queueDepth: number;
  workerUtilization: number;
  packagesAnalyzed: number;
  malwareDetected: number;
  falsePositiveRate: number;
  errorRate: number;
  apiResponseTime: number;
  memoryUsage: number;
}

export interface ErrorContext {
  operation: string;
  packageName?: string;
  stage?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  PARSING_ERROR = 'parsing_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SANDBOX_ERROR = 'sandbox_error',
  LLM_API_ERROR = 'llm_api_error',
  STORAGE_ERROR = 'storage_error',
  VALIDATION_ERROR = 'validation_error',
}

export interface ErrorResolution {
  action: 'retry' | 'skip' | 'fallback' | 'fail';
  fallbackResult?: Partial<AnalysisResult>;
  retryDelay?: number;
  notification?: NotificationSpec;
}

export interface NotificationSpec {
  type: 'webhook' | 'email' | 'slack';
  target: string;
  message: string;
  severity: Severity;
}