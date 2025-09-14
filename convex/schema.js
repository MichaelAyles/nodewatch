"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const values_1 = require("convex/values");
exports.default = (0, server_1.defineSchema)({
    // Enhanced packages table with deduplication support
    packages: (0, server_1.defineTable)({
        name: values_1.v.string(),
        version: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        registry_data: values_1.v.optional(values_1.v.any()),
        tarball_url: values_1.v.optional(values_1.v.string()),
        analysis_status: values_1.v.string(), // "pending", "analyzing", "completed", "failed"
        // Content deduplication fields
        content_hash: values_1.v.string(), // SHA-256 hash of all package files
        package_hash: values_1.v.string(), // Unique hash for this package version
        file_count: values_1.v.number(),
        total_size: values_1.v.number(),
        unique_files: values_1.v.number(),
        duplicate_files: values_1.v.array(values_1.v.string()),
        // Enhanced metadata
        download_count: values_1.v.optional(values_1.v.number()),
        maintainer_info: values_1.v.optional(values_1.v.object({
            username: values_1.v.string(),
            email: values_1.v.optional(values_1.v.string()),
            two_factor_auth: values_1.v.boolean(),
            account_age: values_1.v.number(),
        })),
        dependency_count: values_1.v.optional(values_1.v.number()),
        typosquatting_score: values_1.v.optional(values_1.v.number()),
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    }).index("by_name", ["name"])
        .index("by_status", ["analysis_status"])
        .index("by_content_hash", ["content_hash"])
        .index("by_package_hash", ["package_hash"]),
    // File hashes table for content deduplication
    file_hashes: (0, server_1.defineTable)({
        content_hash: values_1.v.string(), // SHA-256 of file content
        file_path: values_1.v.string(), // Original file path
        size: values_1.v.number(),
        lines: values_1.v.number(),
        is_text: values_1.v.boolean(),
        encoding: values_1.v.optional(values_1.v.string()),
        // Analysis results cached by content hash
        analysis_results: values_1.v.optional(values_1.v.any()),
        first_seen: values_1.v.number(),
        last_seen: values_1.v.number(),
        package_count: values_1.v.number(), // How many packages contain this file
        created_at: values_1.v.number(),
    }).index("by_hash", ["content_hash"])
        .index("by_first_seen", ["first_seen"])
        .index("by_package_count", ["package_count"]),
    // Package file relationships
    package_files: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        file_hash_id: values_1.v.id("file_hashes"),
        file_path: values_1.v.string(), // Path within the package
        is_duplicate: values_1.v.boolean(), // True if this file content appears elsewhere
    }).index("by_package", ["package_id"])
        .index("by_file_hash", ["file_hash_id"])
        .index("by_duplicates", ["is_duplicate"]),
    // Dependency graph for packages
    dependency_graph: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        dependency_id: values_1.v.id("packages"),
        version_range: values_1.v.string(),
        dependency_type: values_1.v.string(), // "production", "development", "peer", "optional"
        depth: values_1.v.number(), // Dependency depth (0 = direct, 1 = transitive, etc.)
    }).index("by_package", ["package_id"])
        .index("by_dependency", ["dependency_id"])
        .index("by_type", ["dependency_type"])
        .index("by_depth", ["depth"]),
    // Enhanced analysis results
    analysis_results: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        stage: values_1.v.string(), // "static", "dynamic", "llm"
        status: values_1.v.string(), // "pending", "running", "completed", "failed"
        results: values_1.v.optional(values_1.v.any()),
        error: values_1.v.optional(values_1.v.string()),
        // Performance tracking
        started_at: values_1.v.optional(values_1.v.number()),
        completed_at: values_1.v.optional(values_1.v.number()),
        processing_time_ms: values_1.v.optional(values_1.v.number()),
        // Cache information
        cache_hit: values_1.v.boolean(),
        content_hash: values_1.v.optional(values_1.v.string()), // Hash of content that was analyzed
    }).index("by_package", ["package_id"])
        .index("by_stage", ["stage"])
        .index("by_status", ["status"])
        .index("by_cache_hit", ["cache_hit"])
        .index("by_content_hash", ["content_hash"]),
    // Enhanced risk scores with detailed tracking
    risk_scores: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        overall_score: values_1.v.number(), // 0-100, higher is riskier
        static_score: values_1.v.optional(values_1.v.number()),
        dynamic_score: values_1.v.optional(values_1.v.number()),
        llm_score: values_1.v.optional(values_1.v.number()),
        // Detailed risk breakdown
        risk_signals: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            severity: values_1.v.string(),
            confidence: values_1.v.number(),
            description: values_1.v.string(),
        })),
        reasons: values_1.v.array(values_1.v.string()),
        // Scoring metadata
        scoring_version: values_1.v.string(), // Version of scoring algorithm used
        calculated_at: values_1.v.number(),
        calculation_time_ms: values_1.v.number(),
    }).index("by_package", ["package_id"])
        .index("by_overall_score", ["overall_score"])
        .index("by_calculated_at", ["calculated_at"]),
    // Sandbox analysis results
    sandbox_results: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        // Behavioral data
        behaviors: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            timestamp: values_1.v.number(),
            details: values_1.v.any(),
            risk_level: values_1.v.string(),
        })),
        // Network activity
        network_events: values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            destination: values_1.v.string(),
            port: values_1.v.optional(values_1.v.number()),
            protocol: values_1.v.string(),
            blocked: values_1.v.boolean(),
            timestamp: values_1.v.number(),
        })),
        // File operations
        file_operations: values_1.v.array(values_1.v.object({
            operation: values_1.v.string(),
            path: values_1.v.string(),
            success: values_1.v.boolean(),
            timestamp: values_1.v.number(),
        })),
        // Process spawning
        process_spawns: values_1.v.array(values_1.v.object({
            command: values_1.v.string(),
            args: values_1.v.array(values_1.v.string()),
            exit_code: values_1.v.optional(values_1.v.number()),
            timestamp: values_1.v.number(),
        })),
        // Resource usage
        resource_metrics: values_1.v.object({
            max_memory_mb: values_1.v.number(),
            cpu_time_ms: values_1.v.number(),
            disk_writes_mb: values_1.v.number(),
            network_bytes_sent: values_1.v.number(),
        }),
        execution_time_ms: values_1.v.number(),
        exit_code: values_1.v.optional(values_1.v.number()),
        created_at: values_1.v.number(),
    }).index("by_package", ["package_id"])
        .index("by_created_at", ["created_at"]),
    // LLM analysis results with cost tracking
    llm_analyses: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        provider: values_1.v.string(), // "openai", "anthropic", "local"
        model: values_1.v.string(),
        // Input data
        evidence_bundle: values_1.v.any(),
        prompt_tokens: values_1.v.number(),
        // Response data
        response: values_1.v.any(),
        completion_tokens: values_1.v.number(),
        total_tokens: values_1.v.number(),
        // Cost and performance
        cost_usd: values_1.v.number(),
        processing_time_ms: values_1.v.number(),
        confidence: values_1.v.number(),
        created_at: values_1.v.number(),
    }).index("by_package", ["package_id"])
        .index("by_provider", ["provider"])
        .index("by_created_at", ["created_at"])
        .index("by_cost", ["cost_usd"]),
    // Batch job tracking
    batch_jobs: (0, server_1.defineTable)({
        name: values_1.v.string(),
        status: values_1.v.string(), // "pending", "running", "completed", "failed", "cancelled"
        // Progress tracking
        total_packages: values_1.v.number(),
        completed_packages: values_1.v.number(),
        failed_packages: values_1.v.number(),
        skipped_packages: values_1.v.number(), // Packages skipped due to cache hits
        // Timing
        started_at: values_1.v.optional(values_1.v.number()),
        completed_at: values_1.v.optional(values_1.v.number()),
        estimated_completion: values_1.v.optional(values_1.v.number()),
        // Configuration
        configuration: values_1.v.any(),
        // Results summary
        results: values_1.v.optional(values_1.v.object({
            total_analyzed: values_1.v.number(),
            malware_detected: values_1.v.number(),
            high_risk_packages: values_1.v.number(),
            cache_hit_rate: values_1.v.number(),
            total_cost_usd: values_1.v.number(),
            processing_time_ms: values_1.v.number(),
        })),
        created_at: values_1.v.number(),
    }).index("by_status", ["status"])
        .index("by_created_at", ["created_at"]),
    // Cache statistics and monitoring
    cache_stats: (0, server_1.defineTable)({
        timestamp: values_1.v.number(),
        // Hit rates
        file_hash_hits: values_1.v.number(),
        file_hash_misses: values_1.v.number(),
        package_hash_hits: values_1.v.number(),
        package_hash_misses: values_1.v.number(),
        analysis_hits: values_1.v.number(),
        analysis_misses: values_1.v.number(),
        // Deduplication savings
        total_files_processed: values_1.v.number(),
        unique_content_hashes: values_1.v.number(),
        duplicate_files_found: values_1.v.number(),
        space_saved_bytes: values_1.v.number(),
        // Performance metrics
        avg_analysis_time_ms: values_1.v.number(),
        total_packages_analyzed: values_1.v.number(),
        total_cost_usd: values_1.v.number(),
    }).index("by_timestamp", ["timestamp"]),
});
//# sourceMappingURL=schema.js.map