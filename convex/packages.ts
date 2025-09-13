import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitPackage = mutation({
  args: {
    name: v.string(),
    version: v.optional(v.string()),
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

export const getPackage = query({
  args: { id: v.id("packages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listPackages = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("packages")
        .withIndex("by_status", (q) => 
          q.eq("analysis_status", args.status!)
        )
        .take(args.limit || 100);
    }

    return await ctx.db
      .query("packages")
      .take(args.limit || 100);
  },
});

export const updatePackageStatus = mutation({
  args: {
    id: v.id("packages"),
    status: v.string(),
    registry_data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      analysis_status: args.status,
      registry_data: args.registry_data,
      updated_at: Date.now(),
    });
  },
});