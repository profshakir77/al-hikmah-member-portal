/**
 * Vercel serverless entry point.
 * Wraps the Express app so all /api/* routes are handled by a single serverless function.
 */
import app from "../artifacts/api-server/src/app";
import { seedDefaultAdmin } from "../artifacts/api-server/src/lib/seed";

// Seed default admin on cold start (idempotent — skips if any user already exists)
seedDefaultAdmin().catch((e) =>
  console.error("[api/index] seed failed:", e)
);

export default app;
