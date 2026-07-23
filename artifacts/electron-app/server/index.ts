import * as net from "net";
import { initDb } from "./db.js";
import { seedDefaultAdmin } from "./lib/seed.js";
import { createApp } from "./app.js";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", reject);
  });
}

export async function startServer(dataDir: string, rendererPath: string): Promise<number> {
  // Initialize the embedded database
  await initDb(dataDir);

  // Seed default admin user on first run
  await seedDefaultAdmin();

  // Create Express app
  const app = createApp(rendererPath);

  // Find a free port and start listening
  const port = await getFreePort();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", () => {
      console.log(`[server] Listening on http://127.0.0.1:${port}`);
      resolve(port);
    });
    server.on("error", reject);
  });
}
