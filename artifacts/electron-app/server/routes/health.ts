import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok", mode: "desktop", ts: new Date().toISOString() });
});

export default router;
