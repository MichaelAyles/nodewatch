import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveAnalysisResult = mutation({
  args: {
    package_id: v.id("packages"),
    stage: v.string(),
    results: v.any(),
    error: v.optional(v.string()),
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

export const saveRiskScore = mutation({
  args: {
    package_id: v.id("packages"),
    overall_score: v.number(),
    static_score: v.optional(v.number()),
    dynamic_score: v.optional(v.number()),
    llm_score: v.optional(v.number()),
    reasons: v.array(v.string()),
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

export const getPackageAnalysis = query({
  args: { package_id: v.id("packages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.package_id);
    if (!pkg) return null;

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

export const getPackageByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const pkg = await ctx.db
      .query("packages")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!pkg) return null;

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