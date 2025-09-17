"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageByName = exports.getPackageAnalysis = exports.saveRiskScore = exports.saveAnalysisResult = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.saveAnalysisResult = (0, server_1.mutation)({
    args: {
        package_id: values_1.v.id("packages"),
        stage: values_1.v.string(),
        results: values_1.v.any(),
        error: values_1.v.optional(values_1.v.string()),
        processing_time_ms: values_1.v.optional(values_1.v.number()),
        cache_hit: values_1.v.optional(values_1.v.boolean()),
        content_hash: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("analysis_results")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .filter((q) => q.eq(q.field("stage"), args.stage))
            .first();
        const now = Date.now();
        const processingTime = args.processing_time_ms || 0;
        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.error ? "failed" : "completed",
                results: args.results,
                error: args.error,
                completed_at: now,
                processing_time_ms: processingTime,
                cache_hit: args.cache_hit || false,
                content_hash: args.content_hash,
            });
            return existing._id;
        }
        return await ctx.db.insert("analysis_results", {
            package_id: args.package_id,
            stage: args.stage,
            status: args.error ? "failed" : "completed",
            results: args.results,
            error: args.error,
            started_at: now - processingTime,
            completed_at: now,
            processing_time_ms: processingTime,
            cache_hit: args.cache_hit || false,
            content_hash: args.content_hash,
        });
    },
});
exports.saveRiskScore = (0, server_1.mutation)({
    args: {
        package_id: values_1.v.id("packages"),
        overall_score: values_1.v.number(),
        static_score: values_1.v.optional(values_1.v.number()),
        dynamic_score: values_1.v.optional(values_1.v.number()),
        llm_score: values_1.v.optional(values_1.v.number()),
        risk_signals: values_1.v.optional(values_1.v.array(values_1.v.object({
            type: values_1.v.string(),
            severity: values_1.v.string(),
            confidence: values_1.v.number(),
            description: values_1.v.string(),
        }))),
        reasons: values_1.v.array(values_1.v.string()),
        scoring_version: values_1.v.optional(values_1.v.string()),
        calculation_time_ms: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("risk_scores")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .first();
        const now = Date.now();
        const data = {
            package_id: args.package_id,
            overall_score: args.overall_score,
            static_score: args.static_score,
            dynamic_score: args.dynamic_score,
            llm_score: args.llm_score,
            risk_signals: args.risk_signals || [],
            reasons: args.reasons,
            scoring_version: args.scoring_version || "1.0",
            calculated_at: now,
            calculation_time_ms: args.calculation_time_ms || 0,
        };
        if (existing) {
            await ctx.db.patch(existing._id, data);
            return existing._id;
        }
        return await ctx.db.insert("risk_scores", data);
    },
});
exports.getPackageAnalysis = (0, server_1.query)({
    args: { package_id: values_1.v.id("packages") },
    handler: async (ctx, args) => {
        const pkg = await ctx.db.get(args.package_id);
        if (!pkg)
            return null;
        const analysisResults = await ctx.db
            .query("analysis_results")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .collect();
        const riskScore = await ctx.db
            .query("risk_scores")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .first();
        return {
            package: pkg,
            analysis_results: analysisResults,
            risk_score: riskScore,
        };
    },
});
exports.getPackageByName = (0, server_1.query)({
    args: { name: values_1.v.string() },
    handler: async (ctx, args) => {
        const pkg = await ctx.db
            .query("packages")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();
        if (!pkg)
            return null;
        const analysisResults = await ctx.db
            .query("analysis_results")
            .withIndex("by_package", (q) => q.eq("package_id", pkg._id))
            .collect();
        const riskScore = await ctx.db
            .query("risk_scores")
            .withIndex("by_package", (q) => q.eq("package_id", pkg._id))
            .first();
        return {
            package: pkg,
            analysis_results: analysisResults,
            risk_score: riskScore,
        };
    },
});
//# sourceMappingURL=analysis.js.map