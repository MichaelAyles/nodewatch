import { ConvexHttpClient } from "convex/browser";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let convexClient: ConvexHttpClient | null = null;

if (process.env.CONVEX_URL) {
  convexClient = new ConvexHttpClient(process.env.CONVEX_URL);
}

export { convexClient };

export function isConvexConfigured(): boolean {
  return convexClient !== null;
}
