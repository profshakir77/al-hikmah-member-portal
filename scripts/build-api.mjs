/**
 * Builds api/index.js — the Vercel serverless function for the Express API.
 * Uses import.meta.url to locate the repo root regardless of cwd.
 */
import { build } from "esbuild";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = resolve(repoRoot, "api");

mkdirSync(apiDir, { recursive: true });

const entry = `
import { createHash } from 'crypto';
import { pool } from './lib/db/src/index';
import app from './artifacts/api-server/src/app';

async function initSchema() {
  await pool.query(\`
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
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      organization_name TEXT NOT NULL DEFAULT 'Community Organization',
      monthly_due_amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
      whatsapp_alert_template TEXT NOT NULL DEFAULT 'Dear {name}, your monthly contribution of {amount} {currency} for {month}/{year} is outstanding.',
      whatsapp_receipt_template TEXT NOT NULL DEFAULT 'Dear {name}, we have received your payment of {amount} {currency} for {month} {year}. JazakAllah Khair!',
      currency TEXT NOT NULL DEFAULT 'EUR'
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
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS reset_token TEXT;
    ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
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
  \`);
}

async function seedAdmin() {
  const { rows } = await pool.query('SELECT id FROM settings LIMIT 1');
  if (rows.length === 0) {
    await pool.query('INSERT INTO settings DEFAULT VALUES');
  }
  const { rows: users } = await pool.query('SELECT id FROM portal_users LIMIT 1');
  if (users.length === 0) {
    const hash = createHash('sha256').update('admin123').digest('hex');
    await pool.query(
      "INSERT INTO portal_users (username, name, role, password_hash) VALUES ('admin', 'Administrator', 'admin', $1)",
      [hash]
    );
    console.log('Default admin created');
  }
}

const init = initSchema().then(seedAdmin).catch(console.error);

module.exports = async (req, res) => {
  await init;
  return app(req, res);
};
`;

await build({
  stdin: {
    contents: entry,
    loader: "ts",
    resolveDir: repoRoot,
  },
  bundle: true,
  platform: "node",
  target: "node18",
  outfile: resolve(apiDir, "index.js"),
  format: "cjs",
  external: ["pg-native"],
  logLevel: "info",
});

console.log("✅ api/index.js built");
