import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
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

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/change-password
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

// POST /api/auth/forgot-password
// Generates a reset link. No email is sent — link is returned to show on screen.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase().trim()));
  if (!user) {
    return res.status(404).json({ error: "No account found with that email address" });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({ resetToken: token, resetTokenExpires: expires })
    .where(eq(usersTable.id, user.id));

  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const resetLink = `${protocol}://${host}/reset-password?token=${token}`;

  return res.json({ resetLink, name: user.name });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  if (String(newPassword).length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, String(token)));
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
  }
  if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(String(newPassword)), resetToken: null, resetTokenExpires: null })
    .where(eq(usersTable.id, user.id));

  return res.json({ message: "Password reset successfully" });
});

export { router as authRouter };
