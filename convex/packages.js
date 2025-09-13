"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePackageStatus = exports.listPackages = exports.getPackage = exports.submitPackage = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.submitPackage = (0, server_1.mutation)({
    args: {
        name: values_1.v.string(),
        version: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("packages")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();
        if (existing && existing.version === args.version) {
            return existing._id;
        }
        const packageId = await ctx.db.insert("packages", {
            name: args.name,
            version: args.version || "latest",
            analysis_status: "pending",
            created_at: Date.now(),
            updated_at: Date.now(),
        });
        // Create analysis tasks
        const stages = ["static", "dynamic", "llm"];
        for (const stage of stages) {
            await ctx.db.insert("analysis_results", {
                package_id: packageId,
                stage,
                status: "pending",
            });
        }
        return packageId;
    },
});
exports.getPackage = (0, server_1.query)({
    args: { id: values_1.v.id("packages") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
exports.listPackages = (0, server_1.query)({
    args: {
        status: values_1.v.optional(values_1.v.string()),
        limit: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        if (args.status) {
            return await ctx.db
                .query("packages")
                .withIndex("by_status", (q) => q.eq("analysis_status", args.status))
                .take(args.limit || 100);
        }
        return await ctx.db
            .query("packages")
            .take(args.limit || 100);
    },
});
exports.updatePackageStatus = (0, server_1.mutation)({
    args: {
        id: values_1.v.id("packages"),
        status: values_1.v.string(),
        registry_data: values_1.v.optional(values_1.v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            analysis_status: args.status,
            registry_data: args.registry_data,
            updated_at: Date.now(),
        });
    },
});
//# sourceMappingURL=packages.js.map