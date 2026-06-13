import { Router } from "express";
import { db, membersTable, paymentsTable, settingsTable } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/export", async (_req, res) => {
  const [members, payments, expenses, settingsRows] = await Promise.all([
    db.select().from(membersTable),
    db.select().from(paymentsTable),
    db.select().from(expensesTable),
    db.select().from(settingsTable),
  ]);

  const [settingsRow] = settingsRows;

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    members: members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
    })),
    expenses: expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      createdAt: e.createdAt.toISOString(),
    })),
    settings: settingsRow
      ? { ...settingsRow, monthlyDueAmount: Number(settingsRow.monthlyDueAmount) }
      : null,
  };

  return res.json(backup);
});

router.post("/import", async (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.members)) {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  await db.transaction(async (tx) => {
    await tx.delete(paymentsTable);
    await tx.delete(expensesTable);
    await tx.delete(membersTable);

    if (data.members.length > 0) {
      await tx.insert(membersTable).values(
        data.members.map((m: Record<string, unknown>) => ({
          id: m.id as number,
          registrationNumber: m.registrationNumber as string,
          name: m.name as string,
          phone: m.phone as string,
          email: (m.email as string | null) ?? null,
          address: (m.address as string | null) ?? null,
          notes: (m.notes as string | null) ?? null,
          status: (m.status as "active" | "inactive") ?? "active",
          joinDate: m.joinDate as string,
          createdAt: new Date(m.createdAt as string),
        }))
      );
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('members', 'id'), (SELECT MAX(id) FROM members))`
      );
    }

    if (Array.isArray(data.payments) && data.payments.length > 0) {
      await tx.insert(paymentsTable).values(
        data.payments.map((p: Record<string, unknown>) => ({
          id: p.id as number,
          memberId: p.memberId as number,
          amount: String(p.amount),
          month: p.month as number,
          year: p.year as number,
          paidAt: new Date(p.paidAt as string),
        }))
      );
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT MAX(id) FROM payments))`
      );
    }

    if (Array.isArray(data.expenses) && data.expenses.length > 0) {
      await tx.insert(expensesTable).values(
        data.expenses.map((e: Record<string, unknown>) => ({
          id: e.id as number,
          title: e.title as string,
          amount: String(e.amount),
          category: e.category as string,
          month: e.month as number,
          year: e.year as number,
          notes: (e.notes as string | null) ?? null,
          createdAt: new Date(e.createdAt as string),
        }))
      );
      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('expenses', 'id'), (SELECT MAX(id) FROM expenses))`
      );
    }

    if (data.settings) {
      const s = data.settings as Record<string, unknown>;
      await tx.delete(settingsTable);
      await tx.insert(settingsTable).values({
        id: s.id as number,
        organizationName: s.organizationName as string,
        currency: s.currency as string,
        monthlyDueAmount: String(s.monthlyDueAmount),
        whatsappAlertTemplate: s.whatsappAlertTemplate as string,
      });
    }
  });

  return res.json({ success: true, importedAt: new Date().toISOString() });
});

export { router as backupRouter };
