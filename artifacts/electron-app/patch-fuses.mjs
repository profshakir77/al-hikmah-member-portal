/**
 * Patches the Windows Electron exe to disable asar integrity validation.
 * This is needed when cross-compiling on Linux (wine not available to update
 * the PE resource that stores the asar hash).
 */
import { flipFuses, FuseVersion, FuseV1Options } from "@electron/fuses";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, statSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exePath = path.join(__dirname, "release/win-unpacked/Al-Hikmah Member Portal.exe");

if (!existsSync(exePath)) {
  console.error("❌ exe not found:", exePath);
  process.exit(1);
}

console.log("🔧 Patching fuses in:", exePath);

await flipFuses(exePath, {
  version: FuseVersion.V1,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
  [FuseV1Options.OnlyLoadAppFromAsar]: false,
});

console.log("✅ Fuses patched — asar integrity validation disabled");

// Re-zip the win-unpacked directory
const zipPath = path.join(__dirname, "release/Al-Hikmah-Member-Portal-win-portable.zip");
console.log("📦 Re-zipping...");
execSync(`cd "${path.join(__dirname, "release")}" && zip -r "Al-Hikmah-Member-Portal-win-portable.zip" "win-unpacked/"`, {
  stdio: "inherit",
});

const size = (statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`✅ Done — ${zipPath} (${size} MB)`);
