/**
 * Self-contained Drizzle schema for the Electron embedded server.
 * Uses pgTable (PostgreSQL dialect) — compatible with PGlite WASM PostgreSQL.
 * Does NOT import drizzle-zod to keep the bundle self-contained.
 */
import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  joinDate: text("join_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Member = typeof membersTable.$inferSelect;

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Expense = typeof expensesTable.$inferSelect;

export const usersTable = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("viewer"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PortalUser = typeof usersTable.$inferSelect;

export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("participant"),
  reference: text("reference"),
  notes: text("notes"),
  year: integer("year").notNull(),
  month: integer("month"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Contribution = typeof contributionsTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  organizationName: text("organization_name").notNull().default("Community Organization"),
  monthlyDueAmount: numeric("monthly_due_amount", { precision: 10, scale: 2 }).notNull().default("10.00"),
  whatsappAlertTemplate: text("whatsapp_alert_template").notNull().default(
    "Dear {name}, your monthly contribution of {amount} {currency} for {month}/{year} is outstanding. Please pay at your earliest convenience. Thank you."
  ),
  whatsappReceiptTemplate: text("whatsapp_receipt_template").notNull().default(
    "Dear {name}, we have received your payment of {amount} {currency} for {month} {year}. JazakAllah Khair! - Al-Hikmah Community Center"
  ),
  currency: text("currency").notNull().default("EUR"),
});

export type Settings = typeof settingsTable.$inferSelect;
