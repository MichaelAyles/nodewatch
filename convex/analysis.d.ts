export declare const saveAnalysisResult: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    package_id: import("convex/values").GenericId<"packages">;
    stage: string;
    results: any;
}, Promise<import("convex/values").GenericId<"analysis_results">>>;
export declare const saveRiskScore: import("convex/server").RegisteredMutation<"public", {
    static_score?: number | undefined;
    dynamic_score?: number | undefined;
    llm_score?: number | undefined;
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
        name: string;
        version: string;
        analysis_status: string;
        created_at: number;
        updated_at: number;
    };
    analysis_results: {
        _id: import("convex/values").GenericId<"analysis_results">;
        _creationTime: number;
        results?: any;
        error?: string | undefined;
        started_at?: number | undefined;
        completed_at?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        stage: string;
        status: string;
    }[];
    risk_score: {
        _id: import("convex/values").GenericId<"risk_scores">;
        _creationTime: number;
        static_score?: number | undefined;
        dynamic_score?: number | undefined;
        llm_score?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        overall_score: number;
        reasons: string[];
        calculated_at: number;
    } | null;
} | null>>;
export declare const getPackageByName: import("convex/server").RegisteredQuery<"public", {
    name: string;
}, Promise<any>>;
//# sourceMappingURL=analysis.d.ts.map