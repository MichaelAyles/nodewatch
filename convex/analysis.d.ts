export declare const saveAnalysisResult: import("convex/server").RegisteredMutation<"public", {
    content_hash?: string | undefined;
    error?: string | undefined;
    processing_time_ms?: number | undefined;
    cache_hit?: boolean | undefined;
    package_id: import("convex/values").GenericId<"packages">;
    stage: string;
    results: any;
}, Promise<import("convex/values").GenericId<"analysis_results">>>;
export declare const saveRiskScore: import("convex/server").RegisteredMutation<"public", {
    static_score?: number | undefined;
    dynamic_score?: number | undefined;
    llm_score?: number | undefined;
    risk_signals?: {
        description: string;
        type: string;
        severity: string;
        confidence: number;
    }[] | undefined;
    scoring_version?: string | undefined;
    calculation_time_ms?: number | undefined;
    package_id: import("convex/values").GenericId<"packages">;
    overall_score: number;
    reasons: string[];
}, Promise<import("convex/values").GenericId<"risk_scores">>>;
export declare const getPackageAnalysis: import("convex/server").RegisteredQuery<"public", {
    package_id: import("convex/values").GenericId<"packages">;
}, Promise<{
    package: {
        _id: import("convex/values").GenericId<"packages">;
        _creationTime: number;
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
    };
    analysis_results: {
        _id: import("convex/values").GenericId<"analysis_results">;
        _creationTime: number;
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
    }[];
    risk_score: {
        _id: import("convex/values").GenericId<"risk_scores">;
        _creationTime: number;
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
    } | null;
} | null>>;
export declare const getPackageByName: import("convex/server").RegisteredQuery<"public", {
    name: string;
}, Promise<{
    package: {
        _id: import("convex/values").GenericId<"packages">;
        _creationTime: number;
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
    };
    analysis_results: {
        _id: import("convex/values").GenericId<"analysis_results">;
        _creationTime: number;
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
    }[];
    risk_score: {
        _id: import("convex/values").GenericId<"risk_scores">;
        _creationTime: number;
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
    } | null;
} | null>>;
//# sourceMappingURL=analysis.d.ts.map