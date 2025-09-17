import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const storeFileHash = mutation({
  args: {
    content_hash: v.string(),
    file_path: v.string(),
    size: v.number(),
    lines: v.number(),
    is_text: v.boolean(),
    encoding: v.optional(v.string()),
    analysis_results: v.optional(v.any()),
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

export const linkPackageFile = mutation({
  args: {
    package_id: v.id("packages"),
    file_hash_id: v.id("file_hashes"),
    file_path: v.string(),
    is_duplicate: v.boolean(),
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

export const getFileHashByContent = query({
  args: { content_hash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("file_hashes")
      .withIndex("by_hash", (q) => q.eq("content_hash", args.content_hash))
      .first();
  },
});

export const getPackageFiles = query({
  args: { package_id: v.id("packages") },
  handler: async (ctx, args) => {
    const packageFiles = await ctx.db
      .query("package_files")
      .withIndex("by_package", (q) => q.eq("package_id", args.package_id))
      .collect();

    const results: any[] = [];
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

export const getMostDuplicatedFiles = query({
  args: { limit: v.optional(v.number()) },
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

export const getFileHashStats = query({
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

export const cleanupOldFileHashes = mutation({
  args: { 
    older_than_days: v.number(),
    min_package_count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.older_than_days * 24 * 60 * 60 * 1000);
    const minPackageCount = args.min_package_count || 1;
    
    const oldFiles = await ctx.db
      .query("file_hashes")
      .withIndex("by_first_seen")
      .filter((q) => 
        q.and(
          q.lt(q.field("last_seen"), cutoffTime),
          q.lt(q.field("package_count"), minPackageCount)
        )
      )
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