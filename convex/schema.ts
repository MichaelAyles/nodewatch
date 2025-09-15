import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Enhanced packages table with deduplication support
  packages: defineTable({
    name: v.string(),
    version: v.string(),
    description: v.optional(v.string()),
    registry_data: v.optional(v.any()),
    tarball_url: v.optional(v.string()),
    analysis_status: v.string(), // "pending", "analyzing", "completed", "failed"
    
    // Content deduplication fields
    content_hash: v.string(), // SHA-256 hash of all package files
    package_hash: v.string(), // Unique hash for this package version
    file_count: v.number(),
    total_size: v.number(),
    unique_files: v.number(),
    duplicate_files: v.array(v.string()),
    
    // Enhanced metadata
    download_count: v.optional(v.number()),
    maintainer_info: v.optional(v.object({
      username: v.string(),
      email: v.optional(v.string()),
      two_factor_auth: v.boolean(),
      account_age: v.number(),
    })),
    dependency_count: v.optional(v.number()),
    typosquatting_score: v.optional(v.number()),
    
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_name", ["name"])
    .index("by_status", ["analysis_status"])
    .index("by_content_hash", ["content_hash"])
    .index("by_package_hash", ["package_hash"]),

  // File hashes table for content deduplication
  file_hashes: defineTable({
    content_hash: v.string(), // SHA-256 of file content
    file_path: v.string(), // Original file path
    size: v.number(),
    lines: v.number(),
    is_text: v.boolean(),
    encoding: v.optional(v.string()),
    
    // Analysis results cached by content hash
    analysis_results: v.optional(v.any()),
    first_seen: v.number(),
    last_seen: v.number(),
    package_count: v.number(), // How many packages contain this file
    
    created_at: v.number(),
  }).index("by_hash", ["content_hash"])
    .index("by_first_seen", ["first_seen"])
    .index("by_package_count", ["package_count"]),

  // Package file relationships
  package_files: defineTable({
    package_id: v.id("packages"),
    file_hash_id: v.id("file_hashes"),
    file_path: v.string(), // Path within the package
    is_duplicate: v.boolean(), // True if this file content appears elsewhere
  }).index("by_package", ["package_id"])
    .index("by_file_hash", ["file_hash_id"])
    .index("by_duplicates", ["is_duplicate"]),

  // Dependency graph for packages
  dependency_graph: defineTable({
    package_id: v.id("packages"),
    dependency_id: v.id("packages"),
    version_range: v.string(),
    dependency_type: v.string(), // "production", "development", "peer", "optional"
    depth: v.number(), // Dependency depth (0 = direct, 1 = transitive, etc.)
  }).index("by_package", ["package_id"])
    .index("by_dependency", ["dependency_id"])
    .index("by_type", ["dependency_type"])
    .index("by_depth", ["depth"]),

  // Enhanced analysis results
  analysis_results: defineTable({
    package_id: v.id("packages"),
    stage: v.string(), // "static", "dynamic", "llm"
    status: v.string(), // "pending", "running", "completed", "failed"
    results: v.optional(v.any()),
    error: v.optional(v.string()),
    
    // Performance tracking
    started_at: v.optional(v.number()),
    completed_at: v.optional(v.number()),
    processing_time_ms: v.optional(v.number()),
    
    // Cache information
    cache_hit: v.boolean(),
    content_hash: v.optional(v.string()), // Hash of content that was analyzed
  }).index("by_package", ["package_id"])
    .index("by_stage", ["stage"])
    .index("by_status", ["status"])
    .index("by_cache_hit", ["cache_hit"])
    .index("by_content_hash", ["content_hash"]),

  // Enhanced risk scores with detailed tracking
  risk_scores: defineTable({
    package_id: v.id("packages"),
    overall_score: v.number(), // 0-100, higher is riskier
    static_score: v.optional(v.number()),
    dynamic_score: v.optional(v.number()),
    llm_score: v.optional(v.number()),
    
    // Detailed risk breakdown
    risk_signals: v.array(v.object({
      type: v.string(),
      severity: v.string(),
      confidence: v.number(),
      description: v.string(),
    })),
    reasons: v.array(v.string()),
    
    // Scoring metadata
    scoring_version: v.string(), // Version of scoring algorithm used
    calculated_at: v.number(),
    calculation_time_ms: v.number(),
  }).index("by_package", ["package_id"])
    .index("by_overall_score", ["overall_score"])
    .index("by_calculated_at", ["calculated_at"]),

  // Sandbox analysis results
  sandbox_results: defineTable({
    package_id: v.id("packages"),
    
    // Behavioral data
    behaviors: v.array(v.object({
      type: v.string(),
      timestamp: v.number(),
      details: v.any(),
      risk_level: v.string(),
    })),
    
    // Network activity
    network_events: v.array(v.object({
      type: v.string(),
      destination: v.string(),
      port: v.optional(v.number()),
      protocol: v.string(),
      blocked: v.boolean(),
      timestamp: v.number(),
    })),
    
    // File operations
    file_operations: v.array(v.object({
      operation: v.string(),
      path: v.string(),
      success: v.boolean(),
      timestamp: v.number(),
    })),
    
    // Process spawning
    process_spawns: v.array(v.object({
      command: v.string(),
      args: v.array(v.string()),
      exit_code: v.optional(v.number()),
      timestamp: v.number(),
    })),
    
    // Resource usage
    resource_metrics: v.object({
      max_memory_mb: v.number(),
      cpu_time_ms: v.number(),
      disk_writes_mb: v.number(),
      network_bytes_sent: v.number(),
    }),
    
    execution_time_ms: v.number(),
    exit_code: v.optional(v.number()),
    created_at: v.number(),
  }).index("by_package", ["package_id"])
    .index("by_created_at", ["created_at"]),

  // LLM analysis results with cost tracking
  llm_analyses: defineTable({
    package_id: v.id("packages"),
    provider: v.string(), // "openai", "anthropic", "local"
    model: v.string(),
    
    // Input data
    evidence_bundle: v.any(),
    prompt_tokens: v.number(),
    
    // Response data
    response: v.any(),
    completion_tokens: v.number(),
    total_tokens: v.number(),
    
    // Cost and performance
    cost_usd: v.number(),
    processing_time_ms: v.number(),
    confidence: v.number(),
    
    created_at: v.number(),
  }).index("by_package", ["package_id"])
    .index("by_provider", ["provider"])
    .index("by_created_at", ["created_at"])
    .index("by_cost", ["cost_usd"]),

  // Batch job tracking
  batch_jobs: defineTable({
    name: v.string(),
    status: v.string(), // "pending", "running", "completed", "failed", "cancelled"
    
    // Progress tracking
    total_packages: v.number(),
    completed_packages: v.number(),
    failed_packages: v.number(),
    skipped_packages: v.number(), // Packages skipped due to cache hits
    
    // Timing
    started_at: v.optional(v.number()),
    completed_at: v.optional(v.number()),
    estimated_completion: v.optional(v.number()),
    
    // Configuration
    configuration: v.any(),
    
    // Results summary
    results: v.optional(v.object({
      total_analyzed: v.number(),
      malware_detected: v.number(),
      high_risk_packages: v.number(),
      cache_hit_rate: v.number(),
      total_cost_usd: v.number(),
      processing_time_ms: v.number(),
    })),
    
    created_at: v.number(),
  }).index("by_status", ["status"])
    .index("by_created_at", ["created_at"]),

  // Cache statistics and monitoring
  cache_stats: defineTable({
    timestamp: v.number(),
    
    // Hit rates
    file_hash_hits: v.number(),
    file_hash_misses: v.number(),
    package_hash_hits: v.number(),
    package_hash_misses: v.number(),
    analysis_hits: v.number(),
    analysis_misses: v.number(),
    
    // Deduplication savings
    total_files_processed: v.number(),
    unique_content_hashes: v.number(),
    duplicate_files_found: v.number(),
    space_saved_bytes: v.number(),
    
    // Performance metrics
    avg_analysis_time_ms: v.number(),
    total_packages_analyzed: v.number(),
    total_cost_usd: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  // Cost tracking
  cost_entries: defineTable({
    type: v.string(), // "llm", "compute", "storage"
    provider: v.string(),
    model: v.optional(v.string()),
    operation: v.string(),
    cost: v.number(),
    currency: v.string(),
    
    // Metadata
    tokens: v.optional(v.number()),
    requests: v.optional(v.number()),
    duration: v.optional(v.number()),
    bytes: v.optional(v.number()),
    package_name: v.optional(v.string()),
    job_id: v.optional(v.string()),
    
    // Timestamps
    timestamp: v.number(),
    date: v.string(), // YYYY-MM-DD for easy daily aggregation
    month: v.string(), // YYYY-MM for monthly aggregation
  }).index("by_timestamp", ["timestamp"])
    .index("by_date", ["date"])
    .index("by_month", ["month"])
    .index("by_type", ["type"])
    .index("by_provider", ["provider"])
    .index("by_package", ["package_name"]),

  // Daily cost summaries
  daily_costs: defineTable({
    date: v.string(), // YYYY-MM-DD
    total_cost: v.number(),
    llm_cost: v.number(),
    compute_cost: v.number(),
    storage_cost: v.number(),
    
    // Breakdown by provider
    cost_by_provider: v.object({
      openrouter: v.number(),
      local: v.number(),
      convex: v.number(),
    }),
    
    // Usage metrics
    total_requests: v.number(),
    total_tokens: v.number(),
    total_analyses: v.number(),
    
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_date", ["date"]),

  // Analytics events
  analytics_events: defineTable({
    event: v.string(),
    properties: v.any(),
    timestamp: v.number(),
    date: v.string(), // YYYY-MM-DD
    hour: v.string(), // YYYY-MM-DD-HH
    
    // Optional user tracking (for future use)
    user_id: v.optional(v.string()),
    session_id: v.optional(v.string()),
    
    // Environment context
    environment: v.string(),
    node_version: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"])
    .index("by_date", ["date"])
    .index("by_hour", ["hour"])
    .index("by_event", ["event"])
    .index("by_environment", ["environment"]),

  // System metrics (for monitoring dashboard)
  system_metrics: defineTable({
    timestamp: v.number(),
    
    // Queue metrics
    queue_waiting: v.number(),
    queue_active: v.number(),
    queue_completed: v.number(),
    queue_failed: v.number(),
    
    // Performance metrics
    avg_response_time: v.number(),
    memory_usage_mb: v.number(),
    cpu_usage_percent: v.number(),
    
    // Cost metrics
    daily_cost: v.number(),
    monthly_cost: v.number(),
    
    // Analysis metrics
    success_rate: v.number(),
    throughput_per_hour: v.number(),
    
    // Cache metrics
    cache_hit_rate: v.number(),
    
    created_at: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});