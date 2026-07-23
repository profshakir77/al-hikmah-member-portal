import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { membersTable, paymentsTable, settingsTable } from "../schema.js";
import { expensesTable } from "../schema.js";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const db = getDb();
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();

  const [{ totalMembers }] = await db.select({ totalMembers: sql<number>`count(*)::int` }).from(membersTable);
  const [{ activeMembers }] = await db.select({ activeMembers: sql<number>`count(*)::int` }).from(membersTable).where(eq(membersTable.status, "active"));
  const [{ paidThisMonth }] = await db.select({ paidThisMonth: sql<number>`count(*)::int` }).from(paymentsTable).where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));
  const [{ totalCollectedThisMonth }] = await db.select({ totalCollectedThisMonth: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));
  const [{ totalCollectedThisYear }] = await db.select({ totalCollectedThisYear: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(paymentsTable).where(eq(paymentsTable.year, year));
  const [{ totalExpensesThisMonth }] = await db.select({ totalExpensesThisMonth: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(expensesTable).where(and(eq(expensesTable.month, month), eq(expensesTable.year, year)));
  const [{ totalExpensesThisYear }] = await db.select({ totalExpensesThisYear: sql<number>`coalesce(sum(amount::numeric), 0)::float` }).from(expensesTable).where(eq(expensesTable.year, year));

  const collected = totalCollectedThisMonth ?? 0;
  const expenses = totalExpensesThisMonth ?? 0;

  return res.json({
    totalMembers: totalMembers ?? 0, activeMembers: activeMembers ?? 0,
    paidThisMonth: paidThisMonth ?? 0, unpaidThisMonth: Math.max(0, (activeMembers ?? 0) - (paidThisMonth ?? 0)),
    totalCollectedThisMonth: collected, totalCollectedThisYear: totalCollectedThisYear ?? 0,
    totalExpensesThisMonth: expenses, totalExpensesThisYear: totalExpensesThisYear ?? 0,
    netThisMonth: collected - expenses, month, year,
  });
});

router.get("/monthly", async (req, res) => {
  const db = getDb();
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) return res.status(400).json({ error: "month and year are required" });

  const members = await db.select().from(membersTable).where(eq(membersTable.status, "active"));
  const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));
  const expenses = await db.select().from(expensesTable).where(and(eq(expensesTable.month, month), eq(expensesTable.year, year)));
  const [settingsRow] = await db.select().from(settingsTable);
  const monthlyDue = Number(settingsRow?.monthlyDueAmount ?? 10);

  const paymentMap = new Map(payments.map((p) => [p.memberId, p]));
  const paymentStatuses = members.map((m) => {
    const payment = paymentMap.get(m.id);
    return {
      memberId: m.id, registrationNumber: m.registrationNumber, name: m.name, phone: m.phone,
      paid: !!payment, amount: payment ? Number(payment.amount) : null,
      paidAt: payment ? payment.paidAt.toISOString() : null,
      paymentId: payment ? payment.id : null, month, year,
    };
  });

  const paid = paymentStatuses.filter((p) => p.paid).length;
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expectedTotal = members.length * monthlyDue;

  return res.json({
    month, year, totalMembers: members.length, paid, unpaid: members.length - paid,
    totalCollected, totalExpenses, net: totalCollected - totalExpenses, expectedTotal,
    collectionRate: members.length > 0 ? (paid / members.length) * 100 : 0,
    payments: paymentStatuses,
  });
});

router.get("/yearly", async (req, res) => {
  const db = getDb();
  const year = Number(req.query.year);
  if (!year || isNaN(year)) return res.status(400).json({ error: "year is required" });

  const [{ activeMembers }] = await db.select({ activeMembers: sql<number>`count(*)::int` }).from(membersTable).where(eq(membersTable.status, "active"));
  const [settingsRow] = await db.select().from(settingsTable);
  const monthlyDue = Number(settingsRow?.monthlyDueAmount ?? 10);

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.year, year));
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.year, year));

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mp = payments.filter((p) => p.month === m);
    const me = expenses.filter((e) => e.month === m);
    const collected = mp.reduce((sum, p) => sum + Number(p.amount), 0);
    const exp = me.reduce((sum, e) => sum + Number(e.amount), 0);
    return { month: m, year, paid: mp.length, unpaid: Math.max(0, (activeMembers ?? 0) - mp.length), collected, expenses: exp, net: collected - exp };
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpected = (activeMembers ?? 0) * monthlyDue * 12;

  return res.json({ year, totalCollected, totalExpected, totalExpenses, net: totalCollected - totalExpenses, monthlyBreakdown });
});

router.get("/unpaid", async (req, res) => {
  const db = getDb();
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) return res.status(400).json({ error: "month and year are required" });

  const members = await db.select().from(membersTable).where(eq(membersTable.status, "active"));
  const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));
  const paidIds = new Set(payments.map((p) => p.memberId));
  return res.json(members.filter((m) => !paidIds.has(m.id)).map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.get("/tax-annual", async (req, res) => {
  const db = getDb();
  const year = Number(req.query.year);
  if (!year || isNaN(year)) return res.status(400).json({ error: "year is required" });

  const [{ activeMembers }] = await db.select({ activeMembers: sql<number>`count(*)::int` }).from(membersTable).where(eq(membersTable.status, "active"));
  const [{ totalMembers }] = await db.select({ totalMembers: sql<number>`count(*)::int` }).from(membersTable);
  const [settingsRow] = await db.select().from(settingsTable);
  const orgName = settingsRow?.organizationName ?? "Community Organization";

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.year, year));
  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.year, year));

  const incomeByMonth = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const mp = payments.filter((p) => p.month === month);
    return { month, collected: mp.reduce((sum, p) => sum + Number(p.amount), 0), paymentCount: mp.length };
  });

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const existing = categoryMap.get(e.category) ?? { total: 0, count: 0 };
    categoryMap.set(e.category, { total: existing.total + Number(e.amount), count: existing.count + 1 });
  }
  const expensesByCategory = Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({ category, total, count })).sort((a, b) => b.total - a.total);

  const quarterMonths = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
  const quarterLabels = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
  const quarters = quarterMonths.map((months, i) => {
    const income = payments.filter((p) => months.includes(p.month)).reduce((sum, p) => sum + Number(p.amount), 0);
    const exp = expenses.filter((e) => months.includes(e.month)).reduce((sum, e) => sum + Number(e.amount), 0);
    return { quarter: i + 1, label: quarterLabels[i]!, income, expenses: exp, net: income - exp };
  });

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return res.json({
    year, orgName, totalIncome, totalExpenses, grossSurplus: totalIncome - totalExpenses,
    activeMembers: activeMembers ?? 0, totalMembers: totalMembers ?? 0,
    quarters, incomeByMonth, expensesByCategory,
  });
});

router.get("/members", async (req, res) => {
  const db = getDb();
  const year = Number(req.query.year) || new Date().getFullYear();

  const [settings, members, payments] = await Promise.all([
    db.select().from(settingsTable).limit(1),
    db.select().from(membersTable).orderBy(membersTable.registrationNumber),
    db.select().from(paymentsTable).where(eq(paymentsTable.year, year)),
  ]);

  const orgName = settings[0]?.organizationName ?? "Al-Hikmah Community Center";
  const payMap = new Map<string, typeof payments[0]>();
  for (const p of payments) { payMap.set(`${p.memberId}:${p.month}`, p); }

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const activeMembers = members.filter((m) => m.status === "active").length;
  const maxSlots = activeMembers * 12;
  const collectionRate = maxSlots > 0 ? Math.round((payments.length / maxSlots) * 100) : 0;

  const rows = members.map((m) => {
    const monthlyPayments = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const p = payMap.get(`${m.id}:${month}`);
      return { month, paid: !!p, amount: p ? Number(p.amount) : 0, paidDate: p ? p.paidAt.toISOString() : null };
    });
    return {
      id: m.id, registrationNumber: m.registrationNumber, name: m.name, phone: m.phone,
      status: m.status, joinDate: m.joinDate, monthlyPayments,
      totalPaidMonths: monthlyPayments.filter((x) => x.paid).length,
      totalAmount: monthlyPayments.reduce((s, x) => s + x.amount, 0),
    };
  });

  return res.json({ year, orgName, totalMembers: members.length, activeMembers, totalCollected, collectionRate, members: rows });
});

export { router as reportsRouter };
