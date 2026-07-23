import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

router.get("/", async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    name: usersTable.name,
    role: usersTable.role,
    email: usersTable.email,
    createdAt: usersTable.createdAt,
  }).from(usersTable);

  return res.json(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { username, name, role, password, email } = parsed.data as typeof parsed.data & { email?: string };

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const [user] = await db
    .insert(usersTable)
    .values({ username, name, role, passwordHash: hashPassword(password), email: email?.toLowerCase().trim() || null })
    .returning();

  if (!user) return res.status(500).json({ error: "Failed to create user" });
  return res.status(201).json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateUserParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid ID" });

  const bodyParsed = UpdateUserBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid input" });

  const updates: Record<string, unknown> = {};
  const d = bodyParsed.data as typeof bodyParsed.data & { email?: string | null };
  if (d.name !== undefined) updates.name = d.name;
  if (d.role !== undefined) updates.role = d.role;
  if (d.password !== undefined) updates.passwordHash = hashPassword(d.password);
  if (d.email !== undefined) updates.email = d.email ? d.email.toLowerCase().trim() : null;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, paramParsed.data.id))
    .returning();

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(usersTable).where(eq(usersTable.id, parsed.data.id));
  return res.status(204).send();
});

export { router as usersRouter };
