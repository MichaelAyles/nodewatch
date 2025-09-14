import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveAnalysisResult = mutation({
  args: {
    package_id: v.id("packages"),
    stage: v.string(),
    results: v.any(),
    error: v.optional(v.string()),
    processing_time_ms: v.optional(v.number()),
    cache_hit: v.optional(v.boolean()),
    content_hash: v.optional(v.string()),
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

export const saveRiskScore = mutation({
  args: {
    package_id: v.id("packages"),
    overall_score: v.number(),
    static_score: v.optional(v.number()),
    dynamic_score: v.optional(v.number()),
    llm_score: v.optional(v.number()),
    risk_signals: v.optional(v.array(v.object({
      type: v.string(),
      severity: v.string(),
      confidence: v.number(),
      description: v.string(),
    }))),
    reasons: v.array(v.string()),
    scoring_version: v.optional(v.string()),
    calculation_time_ms: v.optional(v.number()),
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