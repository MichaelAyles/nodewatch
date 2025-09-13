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
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("analysis_results")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .filter((q) => q.eq(q.field("stage"), args.stage))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.error ? "failed" : "completed",
                results: args.results,
                error: args.error,
                completed_at: Date.now(),
            });
            return existing._id;
        }
        return await ctx.db.insert("analysis_results", {
            package_id: args.package_id,
            stage: args.stage,
            status: args.error ? "failed" : "completed",
            results: args.results,
            error: args.error,
            started_at: Date.now(),
            completed_at: Date.now(),
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
        reasons: values_1.v.array(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("risk_scores")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
                calculated_at: Date.now(),
            });
            return existing._id;
        }
        return await ctx.db.insert("risk_scores", {
            ...args,
            calculated_at: Date.now(),
        });
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
        return await ctx.query(api.analysis.getPackageAnalysis, {
            package_id: pkg._id,
        });
    },
});
const api = {
    analysis: {
        getPackageAnalysis: exports.getPackageAnalysis,
    },
};
//# sourceMappingURL=analysis.js.map