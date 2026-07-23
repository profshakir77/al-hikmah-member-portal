/**
 * Build script for the Electron Windows app.
 * Run: node build-electron.mjs
 * Then: electron-builder --win --x64
 */
import { build } from "esbuild";
import { execSync } from "child_process";
import { cpSync, mkdirSync, copyFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

// ── 1. Build the React frontend ─────────────────────────────────────────────
console.log("\n📦 Building React frontend (member-portal)...");
execSync("pnpm --filter @workspace/member-portal run build", {
  env: {
    ...process.env,
    BASE_PATH: "/",
    PORT: "3000",
    NODE_ENV: "production",
  },
  stdio: "inherit",
  cwd: ROOT,
});

// ── 2. Copy frontend build → resources/renderer ──────────────────────────────
const rendererSrc = path.join(ROOT, "artifacts/member-portal/dist/public");
const rendererDst = path.join(__dirname, "resources/renderer");
mkdirSync(rendererDst, { recursive: true });
cpSync(rendererSrc, rendererDst, { recursive: true, force: true });
console.log("✅ Frontend copied to resources/renderer");

// ── 3. Copy icon ──────────────────────────────────────────────────────────────
const iconSrc = path.join(ROOT, "artifacts/member-portal/public/logo.png");
const buildDir = path.join(__dirname, "build");
mkdirSync(buildDir, { recursive: true });
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, path.join(buildDir, "icon.png"));
  console.log("✅ Icon copied");
}

// ── 4. Bundle Electron main process + embedded server ────────────────────────
console.log("\n⚡ Bundling main process + embedded server with esbuild...");
mkdirSync(path.join(__dirname, "dist"), { recursive: true });

await build({
  entryPoints: [path.join(__dirname, "electron/main.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  outfile: path.join(__dirname, "dist/main.js"),
  format: "cjs",
  // Keep native/WASM packages external so their files stay in node_modules
  external: ["electron", "@electric-sql/pglite"],
  tsconfig: path.join(__dirname, "tsconfig.json"),
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "info",
});

console.log("\n✅ Build complete! Run: electron-builder --win --x64");
