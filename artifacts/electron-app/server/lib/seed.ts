import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { usersTable } from "../schema.js";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDefaultAdmin(): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, "admin"));
  if (existing.length > 0) return;

  await db.insert(usersTable).values({
    username: "admin",
    name: "Administrator",
    role: "admin",
    passwordHash: hashPassword("admin123"),
  });
  console.log("Default admin created — username: admin, password: admin123");
}
