import { Router } from "express";
import { db, membersTable, paymentsTable, settingsTable } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
    exportedAt: new Date().toISOString(),
    members: members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
      memberName: "",
      memberRegistrationNumber: "",
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

export { router as backupRouter };
