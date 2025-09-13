"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("convex/server");
const values_1 = require("convex/values");
exports.default = (0, server_1.defineSchema)({
    packages: (0, server_1.defineTable)({
        name: values_1.v.string(),
        version: values_1.v.string(),
        description: values_1.v.optional(values_1.v.string()),
        registry_data: values_1.v.optional(values_1.v.any()),
        tarball_url: values_1.v.optional(values_1.v.string()),
        analysis_status: values_1.v.string(), // "pending", "analyzing", "completed", "failed"
        created_at: values_1.v.number(),
        updated_at: values_1.v.number(),
    }).index("by_name", ["name"])
        .index("by_status", ["analysis_status"]),
    analysis_results: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        stage: values_1.v.string(), // "static", "dynamic", "llm"
        status: values_1.v.string(), // "pending", "running", "completed", "failed"
        results: values_1.v.optional(values_1.v.any()),
        error: values_1.v.optional(values_1.v.string()),
        started_at: values_1.v.optional(values_1.v.number()),
        completed_at: values_1.v.optional(values_1.v.number()),
    }).index("by_package", ["package_id"])
        .index("by_stage", ["stage"]),
    risk_scores: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        overall_score: values_1.v.number(), // 0-100, higher is riskier
        static_score: values_1.v.optional(values_1.v.number()),
        dynamic_score: values_1.v.optional(values_1.v.number()),
        llm_score: values_1.v.optional(values_1.v.number()),
        reasons: values_1.v.array(values_1.v.string()),
        calculated_at: values_1.v.number(),
    }).index("by_package", ["package_id"]),
    file_contents: (0, server_1.defineTable)({
        package_id: values_1.v.id("packages"),
        file_path: values_1.v.string(),
        content_hash: values_1.v.string(), // SHA-256
        content: values_1.v.string(),
        size: values_1.v.number(),
    }).index("by_package", ["package_id"])
        .index("by_hash", ["content_hash"]),
});
//# sourceMappingURL=schema.js.map