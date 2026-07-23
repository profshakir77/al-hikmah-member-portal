import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes/index.js";

export function createApp(rendererPath: string): Express {
  const app = express();

  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use("/api", router);

  // Serve the built React frontend as static files
  app.use(express.static(rendererPath));

  // SPA fallback — send index.html for any non-API route
  app.get("*", (_req, res) => {
    res.sendFile(path.join(rendererPath, "index.html"));
  });

  return app;
}
