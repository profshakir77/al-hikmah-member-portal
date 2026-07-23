/**
 * Builds api/index.js — Vercel serverless function for the Express API.
 * Uses import.meta.url to locate the repo root regardless of cwd.
 */
import { build } from "esbuild";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Derive repo root from this script's location (scripts/ is always one level below root)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = resolve(repoRoot, "api");

mkdirSync(apiDir, { recursive: true });

await build({
  stdin: {
    contents: `
import app from './artifacts/api-server/src/app';
import { seedDefaultAdmin } from './artifacts/api-server/src/lib/seed';
seedDefaultAdmin().catch(console.error);
module.exports = app;
`,
    loader: "ts",
    resolveDir: repoRoot,
  },
  bundle: true,
  platform: "node",
  target: "node18",
  outfile: resolve(apiDir, "index.js"),
  format: "cjs",
  external: ["pg-native"],
  logLevel: "info",
});

console.log("✅ api/index.js built");
