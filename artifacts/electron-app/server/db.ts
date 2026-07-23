import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema.js";

// PGlite is ESM-only — must use dynamic import() so CJS main bundle can load it.
// Static require() of an ESM package causes a silent process crash in Electron.
type PGliteInstance = InstanceType<Awaited<typeof import("@electric-sql/pglite")>["PGlite"]>;

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function initDb(dataDir: string): Promise<ReturnType<typeof drizzle>> {
  const fs = await import("fs");
  fs.mkdirSync(dataDir, { recursive: true });

  // Dynamic import keeps this compatible with a CJS outer bundle
  const { PGlite } = await import("@electric-sql/pglite");

  const pgDataDir = dataDir + "/pgdata";
  const client: PGliteInstance = new PGlite(pgDataDir);
  await client.waitReady;

  // Create tables if they don't exist
  await client.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      registration_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      join_date TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      notes TEXT,
      paid_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      category TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS portal_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      amount NUMERIC(10,2) NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'participant',
      reference TEXT,
      notes TEXT,
      year INTEGER NOT NULL,
      month INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      organization_name TEXT NOT NULL DEFAULT 'Community Organization',
      monthly_due_amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
      whatsapp_alert_template TEXT NOT NULL DEFAULT 'Dear {name}, your monthly contribution of {amount} {currency} for {month}/{year} is outstanding. Please pay at your earliest convenience. Thank you.',
      whatsapp_receipt_template TEXT NOT NULL DEFAULT 'Dear {name}, we have received your payment of {amount} {currency} for {month} {year}. JazakAllah Khair! - Al-Hikmah Community Center',
      currency TEXT NOT NULL DEFAULT 'EUR'
    );
  `);

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!dbInstance) throw new Error("Database not initialized. Call initDb() first.");
  return dbInstance;
}
