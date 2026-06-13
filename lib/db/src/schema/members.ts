import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  registrationNumber: true,
  createdAt: true,
}).extend({
  joinDate: z.string().optional(),
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
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

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  paidAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

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
