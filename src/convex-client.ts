import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL not found in environment variables. Make sure .env.local exists.");
}

export const convexClient = new ConvexHttpClient(process.env.CONVEX_URL);

export async function savePackageAnalysis(
  packageName: string,
  version: string,
  analysisResult: any
) {
  // First, create or update the package record
  const packageId = await convexClient.mutation(api.packages.submitPackage, {
    name: packageName,
    version: version,
  });

  // Update package with analysis data
  await convexClient.mutation(api.packages.updatePackageStatus, {
    id: packageId,
    status: "completed",
    registry_data: {
      description: analysisResult.package.description,
      tarball_url: analysisResult.tarball_url,
      analysis_timestamp: analysisResult.timestamp,
    },
  });

  return packageId;
}

export async function getPackageByName(name: string) {
  const packages = await convexClient.query(api.packages.listPackages, {
    limit: 1,
  });
  
  return packages.find((p: any) => p.name === name);
}

export async function listRecentPackages(limit = 10) {
  return await convexClient.query(api.packages.listPackages, {
    limit,
  });
}