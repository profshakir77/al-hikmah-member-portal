import { Router } from "express";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { getDb } from "../db.js";
import { usersTable } from "../schema.js";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

router.get("/", async (_req, res) => {
  const db = getDb();
  const users = await db.select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt }).from(usersTable);
  return res.json(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const db = getDb();
  const { username, name, role, password } = req.body;
  if (!username || !name || !password) return res.status(400).json({ error: "username, name, password are required" });

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) return res.status(409).json({ error: "Username already taken" });

  const [user] = await db.insert(usersTable).values({ username, name, role: role ?? "viewer", passwordHash: hashPassword(password) }).returning();
  if (!user) return res.status(500).json({ error: "Failed to create user" });
  return res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role, createdAt: user.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const updates: Record<string, unknown> = {};
  const d = req.body;
  if (d.name !== undefined) updates.name = d.name;
  if (d.role !== undefined) updates.role = d.role;
  if (d.password !== undefined) updates.passwordHash = hashPassword(d.password);

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ id: user.id, username: user.username, name: user.name, role: user.role, createdAt: user.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.status(204).send();
});

export { router as usersRouter };
