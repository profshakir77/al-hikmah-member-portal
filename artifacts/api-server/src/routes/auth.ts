import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, String(username)));
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const hash = hashPassword(String(password));
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
});

// GET /api/auth/me — verify token and return current user
router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/change-password — change own password
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (String(newPassword).length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  }

  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  if (hashPassword(String(currentPassword)) !== user.passwordHash) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(String(newPassword)) })
    .where(eq(usersTable.id, userId));

  return res.json({ message: "Password changed successfully" });
});

export { router as authRouter };
