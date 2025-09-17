export declare const getSystemStats: import("convex/server").RegisteredQuery<"public", {}, Promise<{
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
}>>;
export declare const getRecentActivity: import("convex/server").RegisteredQuery<"public", {
    hours?: number | undefined;
}, Promise<{
    recentPackages: {
        id: import("convex/values").GenericId<"packages">;
        name: string;
        version: string;
        status: string;
        createdAt: number;
    }[];
    recentAnalyses: {
        id: import("convex/values").GenericId<"analysis_results">;
        packageId: import("convex/values").GenericId<"packages">;
        stage: string;
        completedAt: number | undefined;
        processingTime: number | undefined;
        cacheHit: boolean;
    }[];
    recentThreats: {
        id: import("convex/values").GenericId<"risk_scores">;
        packageId: import("convex/values").GenericId<"packages">;
        overallScore: number;
        riskSignals: {
            description: string;
            type: string;
            severity: string;
            confidence: number;
        }[];
        calculatedAt: number;
    }[];
}>>;
export declare const getQueueStatus: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
    avgProcessingTimeMs: number;
    estimatedQueueTimeMs: number;
}>>;
export declare const getHealthMetrics: import("convex/server").RegisteredQuery<"public", {}, Promise<{
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
}>>;
//# sourceMappingURL=stats.d.ts.map