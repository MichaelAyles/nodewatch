import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  packages: defineTable({
    name: v.string(),
    version: v.string(),
    description: v.optional(v.string()),
    registry_data: v.optional(v.any()),
    tarball_url: v.optional(v.string()),
    analysis_status: v.string(), // "pending", "analyzing", "completed", "failed"
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_name", ["name"])
    .index("by_status", ["analysis_status"]),

  analysis_results: defineTable({
    package_id: v.id("packages"),
    stage: v.string(), // "static", "dynamic", "llm"
    status: v.string(), // "pending", "running", "completed", "failed"
    results: v.optional(v.any()),
    error: v.optional(v.string()),
    started_at: v.optional(v.number()),
    completed_at: v.optional(v.number()),
  }).index("by_package", ["package_id"])
    .index("by_stage", ["stage"]),

  risk_scores: defineTable({
    package_id: v.id("packages"),
    overall_score: v.number(), // 0-100, higher is riskier
    static_score: v.optional(v.number()),
    dynamic_score: v.optional(v.number()),
    llm_score: v.optional(v.number()),
    reasons: v.array(v.string()),
    calculated_at: v.number(),
  }).index("by_package", ["package_id"]),

  file_contents: defineTable({
    package_id: v.id("packages"),
    file_path: v.string(),
    content_hash: v.string(), // SHA-256
    content: v.string(),
    size: v.number(),
  }).index("by_package", ["package_id"])
    .index("by_hash", ["content_hash"]),
});