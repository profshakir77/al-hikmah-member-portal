import { app, BrowserWindow, shell, Menu, dialog } from "electron";
import path from "path";
import fs from "fs";
import { startServer } from "../server/index.js";

// ── Catch crashes that happen BEFORE app.whenReady fires ─────────────────────
// Writes to %APPDATA%\alhikmah-crash.log (or /tmp on Linux) so the error is
// visible even when the process exits before any window can appear.
(function installEarlyCrashLogger() {
  const logPath = path.join(
    process.env.APPDATA || process.env.HOME || "/tmp",
    "alhikmah-crash.log"
  );
  process.on("uncaughtException", (err) => {
    try {
      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] UNCAUGHT: ${err.stack ?? err.message}\n`
      );
    } catch { /* ignore write failures */ }
  });
  process.on("unhandledRejection", (reason) => {
    try {
      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`
      );
    } catch { /* ignore */ }
  });
})();

let mainWindow: BrowserWindow | null = null;
let serverPort: number | null = null;

function getRendererPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }
  return path.join(__dirname, "../resources/renderer");
}

function getDataDir(): string {
  return app.getPath("userData");
}

function writeLog(msg: string): void {
  try {
    const logFile = path.join(app.getPath("userData"), "startup.log");
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    // ignore log failures
  }
}

function showError(title: string, detail: string): void {
  writeLog(`ERROR: ${title} — ${detail}`);
  dialog.showMessageBoxSync({
    type: "error",
    title,
    message: title,
    detail: detail + "\n\nLog file: " + path.join(app.getPath("userData"), "startup.log"),
    buttons: ["OK"],
  });
}

async function createWindow(port: number): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Al-Hikmah Member Management Portal",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Show devtools errors in the log
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    writeLog(`Page load failed: ${desc} (${code}) at ${url}`);
    showError(
      "Page failed to load",
      `Could not load the application UI.\n\nError: ${desc}\nURL: ${url}`
    );
  });

  const url = `http://127.0.0.1:${port}/`;
  writeLog(`Loading URL: ${url}`);
  await mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const dataDir = getDataDir();
  const rendererPath = getRendererPath();

  writeLog(`=== App starting ===`);
  writeLog(`dataDir: ${dataDir}`);
  writeLog(`rendererPath: ${rendererPath}`);
  writeLog(`resourcesPath: ${process.resourcesPath ?? "N/A"}`);
  writeLog(`isPackaged: ${app.isPackaged}`);
  writeLog(`__dirname: ${__dirname}`);

  try {
    writeLog("Starting embedded server...");
    serverPort = await startServer(dataDir, rendererPath);
    writeLog(`Server started on port ${serverPort}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    showError("Server failed to start", msg);
    app.quit();
    return;
  }

  try {
    writeLog("Creating window...");
    await createWindow(serverPort);
    writeLog("Window created OK");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    showError("Window failed to open", msg);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
    await createWindow(serverPort);
  }
});
