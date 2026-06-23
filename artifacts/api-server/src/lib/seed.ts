import { db, usersTable } from "@workspace/db";
import { createHash } from "crypto";
import { logger } from "./logger.js";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDefaultAdmin(): Promise<void> {
  const existing = await db.select().from(usersTable).limit(1);
  if (existing.length > 0) return;

  await db.insert(usersTable).values({
    username: "admin",
    name: "Administrator",
    role: "admin",
    passwordHash: hashPassword("admin123"),
  });

  logger.info("Default admin user created — username: admin, password: admin123");
}
