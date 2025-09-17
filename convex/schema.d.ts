declare const _default: import("convex/server").SchemaDefinition<{
    packages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        registry_data?: any;
        tarball_url?: string | undefined;
        download_count?: number | undefined;
        maintainer_info?: {
            email?: string | undefined;
            username: string;
            two_factor_auth: boolean;
            account_age: number;
        } | undefined;
        dependency_count?: number | undefined;
        typosquatting_score?: number | undefined;
        name: string;
        version: string;
        analysis_status: string;
        content_hash: string;
        package_hash: string;
        file_count: number;
        total_size: number;
        unique_files: number;
        duplicate_files: string[];
        created_at: number;
        updated_at: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        version: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        registry_data: import("convex/values").VAny<any, "optional", string>;
        tarball_url: import("convex/values").VString<string | undefined, "optional">;
        analysis_status: import("convex/values").VString<string, "required">;
        content_hash: import("convex/values").VString<string, "required">;
        package_hash: import("convex/values").VString<string, "required">;
        file_count: import("convex/values").VFloat64<number, "required">;
        total_size: import("convex/values").VFloat64<number, "required">;
        unique_files: import("convex/values").VFloat64<number, "required">;
        duplicate_files: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        download_count: import("convex/values").VFloat64<number | undefined, "optional">;
        maintainer_info: import("convex/values").VObject<{
            email?: string | undefined;
            username: string;
            two_factor_auth: boolean;
            account_age: number;
        } | undefined, {
            username: import("convex/values").VString<string, "required">;
            email: import("convex/values").VString<string | undefined, "optional">;
            two_factor_auth: import("convex/values").VBoolean<boolean, "required">;
            account_age: import("convex/values").VFloat64<number, "required">;
        }, "optional", "username" | "email" | "two_factor_auth" | "account_age">;
        dependency_count: import("convex/values").VFloat64<number | undefined, "optional">;
        typosquatting_score: import("convex/values").VFloat64<number | undefined, "optional">;
        created_at: import("convex/values").VFloat64<number, "required">;
        updated_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "version" | "description" | "registry_data" | "tarball_url" | "analysis_status" | "content_hash" | "package_hash" | "file_count" | "total_size" | "unique_files" | "duplicate_files" | "download_count" | "maintainer_info" | "dependency_count" | "typosquatting_score" | "created_at" | "updated_at" | `registry_data.${string}` | "maintainer_info.username" | "maintainer_info.email" | "maintainer_info.two_factor_auth" | "maintainer_info.account_age">, {
        by_name: ["name", "_creationTime"];
        by_status: ["analysis_status", "_creationTime"];
        by_content_hash: ["content_hash", "_creationTime"];
        by_package_hash: ["package_hash", "_creationTime"];
    }, {}, {}>;
    file_hashes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        encoding?: string | undefined;
        analysis_results?: any;
        content_hash: string;
        created_at: number;
        file_path: string;
        size: number;
        lines: number;
        is_text: boolean;
        first_seen: number;
        last_seen: number;
        package_count: number;
    }, {
        content_hash: import("convex/values").VString<string, "required">;
        file_path: import("convex/values").VString<string, "required">;
        size: import("convex/values").VFloat64<number, "required">;
        lines: import("convex/values").VFloat64<number, "required">;
        is_text: import("convex/values").VBoolean<boolean, "required">;
        encoding: import("convex/values").VString<string | undefined, "optional">;
        analysis_results: import("convex/values").VAny<any, "optional", string>;
        first_seen: import("convex/values").VFloat64<number, "required">;
        last_seen: import("convex/values").VFloat64<number, "required">;
        package_count: import("convex/values").VFloat64<number, "required">;
        created_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "content_hash" | "created_at" | "file_path" | "size" | "lines" | "is_text" | "encoding" | "analysis_results" | "first_seen" | "last_seen" | "package_count" | `analysis_results.${string}`>, {
        by_hash: ["content_hash", "_creationTime"];
        by_first_seen: ["first_seen", "_creationTime"];
        by_package_count: ["package_count", "_creationTime"];
    }, {}, {}>;
    package_files: import("convex/server").TableDefinition<import("convex/values").VObject<{
        file_path: string;
        package_id: import("convex/values").GenericId<"packages">;
        file_hash_id: import("convex/values").GenericId<"file_hashes">;
        is_duplicate: boolean;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        file_hash_id: import("convex/values").VId<import("convex/values").GenericId<"file_hashes">, "required">;
        file_path: import("convex/values").VString<string, "required">;
        is_duplicate: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "file_path" | "package_id" | "file_hash_id" | "is_duplicate">, {
        by_package: ["package_id", "_creationTime"];
        by_file_hash: ["file_hash_id", "_creationTime"];
        by_duplicates: ["is_duplicate", "_creationTime"];
    }, {}, {}>;
    dependency_graph: import("convex/server").TableDefinition<import("convex/values").VObject<{
        package_id: import("convex/values").GenericId<"packages">;
        dependency_id: import("convex/values").GenericId<"packages">;
        version_range: string;
        dependency_type: string;
        depth: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        dependency_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        version_range: import("convex/values").VString<string, "required">;
        dependency_type: import("convex/values").VString<string, "required">;
        depth: import("convex/values").VFloat64<number, "required">;
    }, "required", "package_id" | "dependency_id" | "version_range" | "dependency_type" | "depth">, {
        by_package: ["package_id", "_creationTime"];
        by_dependency: ["dependency_id", "_creationTime"];
        by_type: ["dependency_type", "_creationTime"];
        by_depth: ["depth", "_creationTime"];
    }, {}, {}>;
    analysis_results: import("convex/server").TableDefinition<import("convex/values").VObject<{
        content_hash?: string | undefined;
        results?: any;
        error?: string | undefined;
        started_at?: number | undefined;
        completed_at?: number | undefined;
        processing_time_ms?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        stage: string;
        status: string;
        cache_hit: boolean;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        stage: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        results: import("convex/values").VAny<any, "optional", string>;
        error: import("convex/values").VString<string | undefined, "optional">;
        started_at: import("convex/values").VFloat64<number | undefined, "optional">;
        completed_at: import("convex/values").VFloat64<number | undefined, "optional">;
        processing_time_ms: import("convex/values").VFloat64<number | undefined, "optional">;
        cache_hit: import("convex/values").VBoolean<boolean, "required">;
        content_hash: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "content_hash" | "package_id" | "stage" | "status" | "results" | "error" | "started_at" | "completed_at" | "processing_time_ms" | "cache_hit" | `results.${string}`>, {
        by_package: ["package_id", "_creationTime"];
        by_stage: ["stage", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_cache_hit: ["cache_hit", "_creationTime"];
        by_content_hash: ["content_hash", "_creationTime"];
    }, {}, {}>;
    risk_scores: import("convex/server").TableDefinition<import("convex/values").VObject<{
        static_score?: number | undefined;
        dynamic_score?: number | undefined;
        llm_score?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        overall_score: number;
        risk_signals: {
            description: string;
            type: string;
            severity: string;
            confidence: number;
        }[];
        reasons: string[];
        scoring_version: string;
        calculated_at: number;
        calculation_time_ms: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        overall_score: import("convex/values").VFloat64<number, "required">;
        static_score: import("convex/values").VFloat64<number | undefined, "optional">;
        dynamic_score: import("convex/values").VFloat64<number | undefined, "optional">;
        llm_score: import("convex/values").VFloat64<number | undefined, "optional">;
        risk_signals: import("convex/values").VArray<{
            description: string;
            type: string;
            severity: string;
            confidence: number;
        }[], import("convex/values").VObject<{
            description: string;
            type: string;
            severity: string;
            confidence: number;
        }, {
            type: import("convex/values").VString<string, "required">;
            severity: import("convex/values").VString<string, "required">;
            confidence: import("convex/values").VFloat64<number, "required">;
            description: import("convex/values").VString<string, "required">;
        }, "required", "description" | "type" | "severity" | "confidence">, "required">;
        reasons: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        scoring_version: import("convex/values").VString<string, "required">;
        calculated_at: import("convex/values").VFloat64<number, "required">;
        calculation_time_ms: import("convex/values").VFloat64<number, "required">;
    }, "required", "package_id" | "overall_score" | "static_score" | "dynamic_score" | "llm_score" | "risk_signals" | "reasons" | "scoring_version" | "calculated_at" | "calculation_time_ms">, {
        by_package: ["package_id", "_creationTime"];
        by_overall_score: ["overall_score", "_creationTime"];
        by_calculated_at: ["calculated_at", "_creationTime"];
    }, {}, {}>;
    sandbox_results: import("convex/server").TableDefinition<import("convex/values").VObject<{
        exit_code?: number | undefined;
        created_at: number;
        package_id: import("convex/values").GenericId<"packages">;
        behaviors: {
            type: string;
            timestamp: number;
            details: any;
            risk_level: string;
        }[];
        network_events: {
            port?: number | undefined;
            type: string;
            timestamp: number;
            destination: string;
            protocol: string;
            blocked: boolean;
        }[];
        file_operations: {
            timestamp: number;
            operation: string;
            path: string;
            success: boolean;
        }[];
        process_spawns: {
            exit_code?: number | undefined;
            timestamp: number;
            command: string;
            args: string[];
        }[];
        resource_metrics: {
            max_memory_mb: number;
            cpu_time_ms: number;
            disk_writes_mb: number;
            network_bytes_sent: number;
        };
        execution_time_ms: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        behaviors: import("convex/values").VArray<{
            type: string;
            timestamp: number;
            details: any;
            risk_level: string;
        }[], import("convex/values").VObject<{
            type: string;
            timestamp: number;
            details: any;
            risk_level: string;
        }, {
            type: import("convex/values").VString<string, "required">;
            timestamp: import("convex/values").VFloat64<number, "required">;
            details: import("convex/values").VAny<any, "required", string>;
            risk_level: import("convex/values").VString<string, "required">;
        }, "required", "type" | "timestamp" | "details" | "risk_level" | `details.${string}`>, "required">;
        network_events: import("convex/values").VArray<{
            port?: number | undefined;
            type: string;
            timestamp: number;
            destination: string;
            protocol: string;
            blocked: boolean;
        }[], import("convex/values").VObject<{
            port?: number | undefined;
            type: string;
            timestamp: number;
            destination: string;
            protocol: string;
            blocked: boolean;
        }, {
            type: import("convex/values").VString<string, "required">;
            destination: import("convex/values").VString<string, "required">;
            port: import("convex/values").VFloat64<number | undefined, "optional">;
            protocol: import("convex/values").VString<string, "required">;
            blocked: import("convex/values").VBoolean<boolean, "required">;
            timestamp: import("convex/values").VFloat64<number, "required">;
        }, "required", "type" | "timestamp" | "destination" | "port" | "protocol" | "blocked">, "required">;
        file_operations: import("convex/values").VArray<{
            timestamp: number;
            operation: string;
            path: string;
            success: boolean;
        }[], import("convex/values").VObject<{
            timestamp: number;
            operation: string;
            path: string;
            success: boolean;
        }, {
            operation: import("convex/values").VString<string, "required">;
            path: import("convex/values").VString<string, "required">;
            success: import("convex/values").VBoolean<boolean, "required">;
            timestamp: import("convex/values").VFloat64<number, "required">;
        }, "required", "timestamp" | "operation" | "path" | "success">, "required">;
        process_spawns: import("convex/values").VArray<{
            exit_code?: number | undefined;
            timestamp: number;
            command: string;
            args: string[];
        }[], import("convex/values").VObject<{
            exit_code?: number | undefined;
            timestamp: number;
            command: string;
            args: string[];
        }, {
            command: import("convex/values").VString<string, "required">;
            args: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            exit_code: import("convex/values").VFloat64<number | undefined, "optional">;
            timestamp: import("convex/values").VFloat64<number, "required">;
        }, "required", "timestamp" | "command" | "args" | "exit_code">, "required">;
        resource_metrics: import("convex/values").VObject<{
            max_memory_mb: number;
            cpu_time_ms: number;
            disk_writes_mb: number;
            network_bytes_sent: number;
        }, {
            max_memory_mb: import("convex/values").VFloat64<number, "required">;
            cpu_time_ms: import("convex/values").VFloat64<number, "required">;
            disk_writes_mb: import("convex/values").VFloat64<number, "required">;
            network_bytes_sent: import("convex/values").VFloat64<number, "required">;
        }, "required", "max_memory_mb" | "cpu_time_ms" | "disk_writes_mb" | "network_bytes_sent">;
        execution_time_ms: import("convex/values").VFloat64<number, "required">;
        exit_code: import("convex/values").VFloat64<number | undefined, "optional">;
        created_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "created_at" | "package_id" | "behaviors" | "network_events" | "file_operations" | "process_spawns" | "exit_code" | "resource_metrics" | "execution_time_ms" | "resource_metrics.max_memory_mb" | "resource_metrics.cpu_time_ms" | "resource_metrics.disk_writes_mb" | "resource_metrics.network_bytes_sent">, {
        by_package: ["package_id", "_creationTime"];
        by_created_at: ["created_at", "_creationTime"];
    }, {}, {}>;
    llm_analyses: import("convex/server").TableDefinition<import("convex/values").VObject<{
        created_at: number;
        package_id: import("convex/values").GenericId<"packages">;
        processing_time_ms: number;
        confidence: number;
        provider: string;
        model: string;
        evidence_bundle: any;
        prompt_tokens: number;
        response: any;
        completion_tokens: number;
        total_tokens: number;
        cost_usd: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        provider: import("convex/values").VString<string, "required">;
        model: import("convex/values").VString<string, "required">;
        evidence_bundle: import("convex/values").VAny<any, "required", string>;
        prompt_tokens: import("convex/values").VFloat64<number, "required">;
        response: import("convex/values").VAny<any, "required", string>;
        completion_tokens: import("convex/values").VFloat64<number, "required">;
        total_tokens: import("convex/values").VFloat64<number, "required">;
        cost_usd: import("convex/values").VFloat64<number, "required">;
        processing_time_ms: import("convex/values").VFloat64<number, "required">;
        confidence: import("convex/values").VFloat64<number, "required">;
        created_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "created_at" | "package_id" | "processing_time_ms" | "confidence" | "provider" | "model" | "evidence_bundle" | "prompt_tokens" | "response" | "completion_tokens" | "total_tokens" | "cost_usd" | `evidence_bundle.${string}` | `response.${string}`>, {
        by_package: ["package_id", "_creationTime"];
        by_provider: ["provider", "_creationTime"];
        by_created_at: ["created_at", "_creationTime"];
        by_cost: ["cost_usd", "_creationTime"];
    }, {}, {}>;
    batch_jobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        results?: {
            processing_time_ms: number;
            total_analyzed: number;
            malware_detected: number;
            high_risk_packages: number;
            cache_hit_rate: number;
            total_cost_usd: number;
        } | undefined;
        started_at?: number | undefined;
        completed_at?: number | undefined;
        estimated_completion?: number | undefined;
        name: string;
        created_at: number;
        status: string;
        total_packages: number;
        completed_packages: number;
        failed_packages: number;
        skipped_packages: number;
        configuration: any;
    }, {
        name: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        total_packages: import("convex/values").VFloat64<number, "required">;
        completed_packages: import("convex/values").VFloat64<number, "required">;
        failed_packages: import("convex/values").VFloat64<number, "required">;
        skipped_packages: import("convex/values").VFloat64<number, "required">;
        started_at: import("convex/values").VFloat64<number | undefined, "optional">;
        completed_at: import("convex/values").VFloat64<number | undefined, "optional">;
        estimated_completion: import("convex/values").VFloat64<number | undefined, "optional">;
        configuration: import("convex/values").VAny<any, "required", string>;
        results: import("convex/values").VObject<{
            processing_time_ms: number;
            total_analyzed: number;
            malware_detected: number;
            high_risk_packages: number;
            cache_hit_rate: number;
            total_cost_usd: number;
        } | undefined, {
            total_analyzed: import("convex/values").VFloat64<number, "required">;
            malware_detected: import("convex/values").VFloat64<number, "required">;
            high_risk_packages: import("convex/values").VFloat64<number, "required">;
            cache_hit_rate: import("convex/values").VFloat64<number, "required">;
            total_cost_usd: import("convex/values").VFloat64<number, "required">;
            processing_time_ms: import("convex/values").VFloat64<number, "required">;
        }, "optional", "processing_time_ms" | "total_analyzed" | "malware_detected" | "high_risk_packages" | "cache_hit_rate" | "total_cost_usd">;
        created_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "created_at" | "status" | "results" | "started_at" | "completed_at" | "total_packages" | "completed_packages" | "failed_packages" | "skipped_packages" | "estimated_completion" | "configuration" | "results.processing_time_ms" | "results.total_analyzed" | "results.malware_detected" | "results.high_risk_packages" | "results.cache_hit_rate" | "results.total_cost_usd" | `configuration.${string}`>, {
        by_status: ["status", "_creationTime"];
        by_created_at: ["created_at", "_creationTime"];
    }, {}, {}>;
    cache_stats: import("convex/server").TableDefinition<import("convex/values").VObject<{
        timestamp: number;
        total_cost_usd: number;
        file_hash_hits: number;
        file_hash_misses: number;
        package_hash_hits: number;
        package_hash_misses: number;
        analysis_hits: number;
        analysis_misses: number;
        total_files_processed: number;
        unique_content_hashes: number;
        duplicate_files_found: number;
        space_saved_bytes: number;
        avg_analysis_time_ms: number;
        total_packages_analyzed: number;
    }, {
        timestamp: import("convex/values").VFloat64<number, "required">;
        file_hash_hits: import("convex/values").VFloat64<number, "required">;
        file_hash_misses: import("convex/values").VFloat64<number, "required">;
        package_hash_hits: import("convex/values").VFloat64<number, "required">;
        package_hash_misses: import("convex/values").VFloat64<number, "required">;
        analysis_hits: import("convex/values").VFloat64<number, "required">;
        analysis_misses: import("convex/values").VFloat64<number, "required">;
        total_files_processed: import("convex/values").VFloat64<number, "required">;
        unique_content_hashes: import("convex/values").VFloat64<number, "required">;
        duplicate_files_found: import("convex/values").VFloat64<number, "required">;
        space_saved_bytes: import("convex/values").VFloat64<number, "required">;
        avg_analysis_time_ms: import("convex/values").VFloat64<number, "required">;
        total_packages_analyzed: import("convex/values").VFloat64<number, "required">;
        total_cost_usd: import("convex/values").VFloat64<number, "required">;
    }, "required", "timestamp" | "total_cost_usd" | "file_hash_hits" | "file_hash_misses" | "package_hash_hits" | "package_hash_misses" | "analysis_hits" | "analysis_misses" | "total_files_processed" | "unique_content_hashes" | "duplicate_files_found" | "space_saved_bytes" | "avg_analysis_time_ms" | "total_packages_analyzed">, {
        by_timestamp: ["timestamp", "_creationTime"];
    }, {}, {}>;
    cost_entries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        bytes?: number | undefined;
        model?: string | undefined;
        tokens?: number | undefined;
        requests?: number | undefined;
        duration?: number | undefined;
        package_name?: string | undefined;
        job_id?: string | undefined;
        type: string;
        timestamp: number;
        operation: string;
        provider: string;
        cost: number;
        currency: string;
        date: string;
        month: string;
    }, {
        type: import("convex/values").VString<string, "required">;
        provider: import("convex/values").VString<string, "required">;
        model: import("convex/values").VString<string | undefined, "optional">;
        operation: import("convex/values").VString<string, "required">;
        cost: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        tokens: import("convex/values").VFloat64<number | undefined, "optional">;
        requests: import("convex/values").VFloat64<number | undefined, "optional">;
        duration: import("convex/values").VFloat64<number | undefined, "optional">;
        bytes: import("convex/values").VFloat64<number | undefined, "optional">;
        package_name: import("convex/values").VString<string | undefined, "optional">;
        job_id: import("convex/values").VString<string | undefined, "optional">;
        timestamp: import("convex/values").VFloat64<number, "required">;
        date: import("convex/values").VString<string, "required">;
        month: import("convex/values").VString<string, "required">;
    }, "required", "bytes" | "type" | "timestamp" | "operation" | "provider" | "model" | "cost" | "currency" | "tokens" | "requests" | "duration" | "package_name" | "job_id" | "date" | "month">, {
        by_timestamp: ["timestamp", "_creationTime"];
        by_date: ["date", "_creationTime"];
        by_month: ["month", "_creationTime"];
        by_type: ["type", "_creationTime"];
        by_provider: ["provider", "_creationTime"];
        by_package: ["package_name", "_creationTime"];
    }, {}, {}>;
    daily_costs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        created_at: number;
        updated_at: number;
        total_tokens: number;
        date: string;
        total_cost: number;
        llm_cost: number;
        compute_cost: number;
        storage_cost: number;
        cost_by_provider: {
            openrouter: number;
            local: number;
            convex: number;
        };
        total_requests: number;
        total_analyses: number;
    }, {
        date: import("convex/values").VString<string, "required">;
        total_cost: import("convex/values").VFloat64<number, "required">;
        llm_cost: import("convex/values").VFloat64<number, "required">;
        compute_cost: import("convex/values").VFloat64<number, "required">;
        storage_cost: import("convex/values").VFloat64<number, "required">;
        cost_by_provider: import("convex/values").VObject<{
            openrouter: number;
            local: number;
            convex: number;
        }, {
            openrouter: import("convex/values").VFloat64<number, "required">;
            local: import("convex/values").VFloat64<number, "required">;
            convex: import("convex/values").VFloat64<number, "required">;
        }, "required", "openrouter" | "local" | "convex">;
        total_requests: import("convex/values").VFloat64<number, "required">;
        total_tokens: import("convex/values").VFloat64<number, "required">;
        total_analyses: import("convex/values").VFloat64<number, "required">;
        created_at: import("convex/values").VFloat64<number, "required">;
        updated_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "created_at" | "updated_at" | "total_tokens" | "date" | "total_cost" | "llm_cost" | "compute_cost" | "storage_cost" | "cost_by_provider" | "total_requests" | "total_analyses" | "cost_by_provider.openrouter" | "cost_by_provider.local" | "cost_by_provider.convex">, {
        by_date: ["date", "_creationTime"];
    }, {}, {}>;
    analytics_events: import("convex/server").TableDefinition<import("convex/values").VObject<{
        user_id?: string | undefined;
        session_id?: string | undefined;
        node_version?: string | undefined;
        timestamp: number;
        date: string;
        event: string;
        properties: any;
        hour: string;
        environment: string;
    }, {
        event: import("convex/values").VString<string, "required">;
        properties: import("convex/values").VAny<any, "required", string>;
        timestamp: import("convex/values").VFloat64<number, "required">;
        date: import("convex/values").VString<string, "required">;
        hour: import("convex/values").VString<string, "required">;
        user_id: import("convex/values").VString<string | undefined, "optional">;
        session_id: import("convex/values").VString<string | undefined, "optional">;
        environment: import("convex/values").VString<string, "required">;
        node_version: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "timestamp" | "date" | "event" | "properties" | "hour" | "user_id" | "session_id" | "environment" | "node_version" | `properties.${string}`>, {
        by_timestamp: ["timestamp", "_creationTime"];
        by_date: ["date", "_creationTime"];
        by_hour: ["hour", "_creationTime"];
        by_event: ["event", "_creationTime"];
        by_environment: ["environment", "_creationTime"];
    }, {}, {}>;
    system_metrics: import("convex/server").TableDefinition<import("convex/values").VObject<{
        created_at: number;
        timestamp: number;
        cache_hit_rate: number;
        queue_waiting: number;
        queue_active: number;
        queue_completed: number;
        queue_failed: number;
        avg_response_time: number;
        memory_usage_mb: number;
        cpu_usage_percent: number;
        daily_cost: number;
        monthly_cost: number;
        success_rate: number;
        throughput_per_hour: number;
    }, {
        timestamp: import("convex/values").VFloat64<number, "required">;
        queue_waiting: import("convex/values").VFloat64<number, "required">;
        queue_active: import("convex/values").VFloat64<number, "required">;
        queue_completed: import("convex/values").VFloat64<number, "required">;
        queue_failed: import("convex/values").VFloat64<number, "required">;
        avg_response_time: import("convex/values").VFloat64<number, "required">;
        memory_usage_mb: import("convex/values").VFloat64<number, "required">;
        cpu_usage_percent: import("convex/values").VFloat64<number, "required">;
        daily_cost: import("convex/values").VFloat64<number, "required">;
        monthly_cost: import("convex/values").VFloat64<number, "required">;
        success_rate: import("convex/values").VFloat64<number, "required">;
        throughput_per_hour: import("convex/values").VFloat64<number, "required">;
        cache_hit_rate: import("convex/values").VFloat64<number, "required">;
        created_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "created_at" | "timestamp" | "cache_hit_rate" | "queue_waiting" | "queue_active" | "queue_completed" | "queue_failed" | "avg_response_time" | "memory_usage_mb" | "cpu_usage_percent" | "daily_cost" | "monthly_cost" | "success_rate" | "throughput_per_hour">, {
        by_timestamp: ["timestamp", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map