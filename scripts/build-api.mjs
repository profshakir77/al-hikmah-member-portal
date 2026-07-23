/**
 * Builds api/index.js — the Vercel serverless function for the Express API.
 * Uses esbuild stdin so no TypeScript source file sits in api/ for Vercel to type-check.
 */
import { build } from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("api", { recursive: true });

await build({
  stdin: {
    contents: `
import app from './artifacts/api-server/src/app';
import { seedDefaultAdmin } from './artifacts/api-server/src/lib/seed';
seedDefaultAdmin().catch(console.error);
module.exports = app;
`,
    loader: "ts",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  target: "node18",
  outfile: "api/index.js",
  format: "cjs",
  external: ["pg-native"],
  logLevel: "info",
});

console.log("✅ api/index.js built");
