"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePackageHashes = exports.getDeduplicationStats = exports.findPackagesByFileHash = exports.findPackageByContentHash = exports.updatePackageStatus = exports.listPackages = exports.getPackage = exports.submitPackage = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.submitPackage = (0, server_1.mutation)({
    args: {
        name: values_1.v.string(),
        version: values_1.v.optional(values_1.v.string()),
        content_hash: values_1.v.optional(values_1.v.string()),
        package_hash: values_1.v.optional(values_1.v.string()),
        file_count: values_1.v.optional(values_1.v.number()),
        total_size: values_1.v.optional(values_1.v.number()),
        unique_files: values_1.v.optional(values_1.v.number()),
        duplicate_files: values_1.v.optional(values_1.v.array(values_1.v.string())),
        registry_data: values_1.v.optional(values_1.v.any()),
    },
    handler: async (ctx, args) => {
        const version = args.version || "latest";
        // Check if package with same content hash already exists
        if (args.content_hash) {
            const existingByContent = await ctx.db
                .query("packages")
                .withIndex("by_content_hash", (q) => q.eq("content_hash", args.content_hash))
                .first();
            if (existingByContent) {
                // Package with identical content already analyzed
                return existingByContent._id;
            }
        }
        // Check if exact package version exists
        const existing = await ctx.db
            .query("packages")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .filter((q) => q.eq(q.field("version"), version))
            .first();
        if (existing) {
            return existing._id;
        }
        const packageId = await ctx.db.insert("packages", {
            name: args.name,
            version,
            analysis_status: "pending",
            content_hash: args.content_hash || "",
            package_hash: args.package_hash || "",
            file_count: args.file_count || 0,
            total_size: args.total_size || 0,
            unique_files: args.unique_files || 0,
            duplicate_files: args.duplicate_files || [],
            registry_data: args.registry_data,
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
                cache_hit: false,
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
exports.findPackageByContentHash = (0, server_1.query)({
    args: { content_hash: values_1.v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("packages")
            .withIndex("by_content_hash", (q) => q.eq("content_hash", args.content_hash))
            .first();
    },
});
exports.findPackagesByFileHash = (0, server_1.query)({
    args: { file_hash: values_1.v.string() },
    handler: async (ctx, args) => {
        // Find all packages that contain a file with this hash
        const fileHashRecord = await ctx.db
            .query("file_hashes")
            .withIndex("by_hash", (q) => q.eq("content_hash", args.file_hash))
            .first();
        if (!fileHashRecord)
            return [];
        const packageFiles = await ctx.db
            .query("package_files")
            .withIndex("by_file_hash", (q) => q.eq("file_hash_id", fileHashRecord._id))
            .collect();
        const packages = [];
        for (const pf of packageFiles) {
            const pkg = await ctx.db.get(pf.package_id);
            if (pkg)
                packages.push(pkg);
        }
        return packages;
    },
});
exports.getDeduplicationStats = (0, server_1.query)({
    args: {},
    handler: async (ctx, args) => {
        const totalPackages = await ctx.db.query("packages").collect();
        const totalFiles = await ctx.db.query("file_hashes").collect();
        // Calculate duplicate files
        const duplicateFiles = totalFiles.filter(f => f.package_count > 1);
        const totalDuplicateInstances = duplicateFiles.reduce((sum, f) => sum + f.package_count - 1, 0);
        // Estimate space saved (rough calculation)
        const spaceSavedBytes = duplicateFiles.reduce((sum, f) => sum + (f.size * (f.package_count - 1)), 0);
        return {
            totalPackages: totalPackages.length,
            totalUniqueFiles: totalFiles.length,
            duplicateFiles: duplicateFiles.length,
            totalDuplicateInstances,
            spaceSavedBytes,
            deduplicationRate: totalFiles.length > 0 ? totalDuplicateInstances / totalFiles.length : 0,
        };
    },
});
exports.updatePackageHashes = (0, server_1.mutation)({
    args: {
        id: values_1.v.id("packages"),
        content_hash: values_1.v.string(),
        package_hash: values_1.v.string(),
        file_count: values_1.v.number(),
        total_size: values_1.v.number(),
        unique_files: values_1.v.number(),
        duplicate_files: values_1.v.array(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            content_hash: args.content_hash,
            package_hash: args.package_hash,
            file_count: args.file_count,
            total_size: args.total_size,
            unique_files: args.unique_files,
            duplicate_files: args.duplicate_files,
            updated_at: Date.now(),
        });
    },
});
//# sourceMappingURL=packages.js.map