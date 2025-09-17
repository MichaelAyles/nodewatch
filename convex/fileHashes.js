"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldFileHashes = exports.getFileHashStats = exports.getMostDuplicatedFiles = exports.getPackageFiles = exports.getFileHashByContent = exports.linkPackageFile = exports.storeFileHash = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.storeFileHash = (0, server_1.mutation)({
    args: {
        content_hash: values_1.v.string(),
        file_path: values_1.v.string(),
        size: values_1.v.number(),
        lines: values_1.v.number(),
        is_text: values_1.v.boolean(),
        encoding: values_1.v.optional(values_1.v.string()),
        analysis_results: values_1.v.optional(values_1.v.any()),
    },
    handler: async (ctx, args) => {
        // Check if file hash already exists
        const existing = await ctx.db
            .query("file_hashes")
            .withIndex("by_hash", (q) => q.eq("content_hash", args.content_hash))
            .first();
        if (existing) {
            // Update existing record
            await ctx.db.patch(existing._id, {
                last_seen: Date.now(),
                package_count: existing.package_count + 1,
                analysis_results: args.analysis_results || existing.analysis_results,
            });
            return existing._id;
        }
        // Create new file hash record
        return await ctx.db.insert("file_hashes", {
            content_hash: args.content_hash,
            file_path: args.file_path,
            size: args.size,
            lines: args.lines,
            is_text: args.is_text,
            encoding: args.encoding,
            analysis_results: args.analysis_results,
            first_seen: Date.now(),
            last_seen: Date.now(),
            package_count: 1,
            created_at: Date.now(),
        });
    },
});
exports.linkPackageFile = (0, server_1.mutation)({
    args: {
        package_id: values_1.v.id("packages"),
        file_hash_id: values_1.v.id("file_hashes"),
        file_path: values_1.v.string(),
        is_duplicate: values_1.v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("package_files", {
            package_id: args.package_id,
            file_hash_id: args.file_hash_id,
            file_path: args.file_path,
            is_duplicate: args.is_duplicate,
        });
    },
});
exports.getFileHashByContent = (0, server_1.query)({
    args: { content_hash: values_1.v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("file_hashes")
            .withIndex("by_hash", (q) => q.eq("content_hash", args.content_hash))
            .first();
    },
});
exports.getPackageFiles = (0, server_1.query)({
    args: { package_id: values_1.v.id("packages") },
    handler: async (ctx, args) => {
        const packageFiles = await ctx.db
            .query("package_files")
            .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
            .collect();
        const results = [];
        for (const pf of packageFiles) {
            const fileHash = await ctx.db.get(pf.file_hash_id);
            if (fileHash) {
                results.push({
                    ...pf,
                    file_hash: fileHash,
                });
            }
        }
        return results;
    },
});
exports.getMostDuplicatedFiles = (0, server_1.query)({
    args: { limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;
        const files = await ctx.db
            .query("file_hashes")
            .withIndex("by_package_count")
            .order("desc")
            .take(limit);
        return files.filter(f => f.package_count > 1);
    },
});
exports.getFileHashStats = (0, server_1.query)({
    args: {},
    handler: async (ctx, args) => {
        const allFiles = await ctx.db.query("file_hashes").collect();
        const totalFiles = allFiles.length;
        const duplicatedFiles = allFiles.filter(f => f.package_count > 1).length;
        const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
        const duplicatedSize = allFiles
            .filter(f => f.package_count > 1)
            .reduce((sum, f) => sum + f.size * (f.package_count - 1), 0);
        const textFiles = allFiles.filter(f => f.is_text).length;
        const binaryFiles = totalFiles - textFiles;
        return {
            totalFiles,
            duplicatedFiles,
            deduplicationRate: totalFiles > 0 ? duplicatedFiles / totalFiles : 0,
            totalSize,
            duplicatedSize,
            spaceSavingRate: totalSize > 0 ? duplicatedSize / totalSize : 0,
            textFiles,
            binaryFiles,
            avgFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
        };
    },
});
exports.cleanupOldFileHashes = (0, server_1.mutation)({
    args: {
        older_than_days: values_1.v.number(),
        min_package_count: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const cutoffTime = Date.now() - (args.older_than_days * 24 * 60 * 60 * 1000);
        const minPackageCount = args.min_package_count || 1;
        const oldFiles = await ctx.db
            .query("file_hashes")
            .withIndex("by_first_seen")
            .filter((q) => q.and(q.lt(q.field("last_seen"), cutoffTime), q.lt(q.field("package_count"), minPackageCount)))
            .collect();
        let deletedCount = 0;
        for (const file of oldFiles) {
            // Delete associated package_files records first
            const packageFiles = await ctx.db
                .query("package_files")
                .withIndex("by_file_hash", (q) => q.eq("file_hash_id", file._id))
                .collect();
            for (const pf of packageFiles) {
                await ctx.db.delete(pf._id);
            }
            // Delete the file hash record
            await ctx.db.delete(file._id);
            deletedCount++;
        }
        return { deletedCount };
    },
});
//# sourceMappingURL=fileHashes.js.map