import { Router } from "express";
import { db, membersTable, paymentsTable, settingsTable } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  GetDashboardStatsQueryParams,
  GetMonthlyReportQueryParams,
  GetYearlyReportQueryParams,
  GetUnpaidMembersQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/dashboard", async (req, res) => {
  const now = new Date();
  const parsed = GetDashboardStatsQueryParams.safeParse({
    month: req.query.month !== undefined ? Number(req.query.month) : undefined,
    year: req.query.year !== undefined ? Number(req.query.year) : undefined,
  });
  const month = (parsed.success && parsed.data.month) ? parsed.data.month : now.getMonth() + 1;
  const year = (parsed.success && parsed.data.year) ? parsed.data.year : now.getFullYear();

  const [{ totalMembers }] = await db
    .select({ totalMembers: sql<number>`count(*)::int` })
    .from(membersTable);

  const [{ activeMembers }] = await db
    .select({ activeMembers: sql<number>`count(*)::int` })
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  const [{ paidThisMonth }] = await db
    .select({ paidThisMonth: sql<number>`count(*)::int` })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));

  const [{ totalCollectedThisMonth }] = await db
    .select({ totalCollectedThisMonth: sql<number>`coalesce(sum(amount::numeric), 0)::float` })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));

  const [{ totalCollectedThisYear }] = await db
    .select({ totalCollectedThisYear: sql<number>`coalesce(sum(amount::numeric), 0)::float` })
    .from(paymentsTable)
    .where(eq(paymentsTable.year, year));

  const [{ totalExpensesThisMonth }] = await db
    .select({ totalExpensesThisMonth: sql<number>`coalesce(sum(amount::numeric), 0)::float` })
    .from(expensesTable)
    .where(and(eq(expensesTable.month, month), eq(expensesTable.year, year)));

  const [{ totalExpensesThisYear }] = await db
    .select({ totalExpensesThisYear: sql<number>`coalesce(sum(amount::numeric), 0)::float` })
    .from(expensesTable)
    .where(eq(expensesTable.year, year));

  const collected = totalCollectedThisMonth ?? 0;
  const expenses = totalExpensesThisMonth ?? 0;

  return res.json({
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    paidThisMonth: paidThisMonth ?? 0,
    unpaidThisMonth: Math.max(0, (activeMembers ?? 0) - (paidThisMonth ?? 0)),
    totalCollectedThisMonth: collected,
    totalCollectedThisYear: totalCollectedThisYear ?? 0,
    totalExpensesThisMonth: expenses,
    totalExpensesThisYear: totalExpensesThisYear ?? 0,
    netThisMonth: collected - expenses,
    month,
    year,
  });
});

router.get("/monthly", async (req, res) => {
  const parsed = GetMonthlyReportQueryParams.safeParse({
    month: Number(req.query.month),
    year: Number(req.query.year),
  });
  if (!parsed.success) return res.status(400).json({ error: "month and year are required" });
  const { month, year } = parsed.data;

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.month, month), eq(expensesTable.year, year)));

  const [settingsRow] = await db.select().from(settingsTable);
  const monthlyDue = Number(settingsRow?.monthlyDueAmount ?? 10);

  const paymentMap = new Map(payments.map((p) => [p.memberId, p]));

  const paymentStatuses = members.map((m) => {
    const payment = paymentMap.get(m.id);
    return {
      memberId: m.id,
      registrationNumber: m.registrationNumber,
      name: m.name,
      phone: m.phone,
      paid: !!payment,
      amount: payment ? Number(payment.amount) : null,
      paidAt: payment ? payment.paidAt.toISOString() : null,
      paymentId: payment ? payment.id : null,
      month,
      year,
    };
  });

  const paid = paymentStatuses.filter((p) => p.paid).length;
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expectedTotal = members.length * monthlyDue;

  return res.json({
    month,
    year,
    totalMembers: members.length,
    paid,
    unpaid: members.length - paid,
    totalCollected,
    totalExpenses,
    net: totalCollected - totalExpenses,
    expectedTotal,
    collectionRate: members.length > 0 ? (paid / members.length) * 100 : 0,
    payments: paymentStatuses,
  });
});

router.get("/yearly", async (req, res) => {
  const parsed = GetYearlyReportQueryParams.safeParse({
    year: Number(req.query.year),
  });
  if (!parsed.success) return res.status(400).json({ error: "year is required" });
  const { year } = parsed.data;

  const [{ activeMembers }] = await db
    .select({ activeMembers: sql<number>`count(*)::int` })
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  const [settingsRow] = await db.select().from(settingsTable);
  const monthlyDue = Number(settingsRow?.monthlyDueAmount ?? 10);

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.year, year));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.year, year));

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const monthPayments = payments.filter((p) => p.month === m);
    const monthExpenses = expenses.filter((e) => e.month === m);
    const collected = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const exp = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return {
      month: m,
      year,
      paid: monthPayments.length,
      unpaid: Math.max(0, (activeMembers ?? 0) - monthPayments.length),
      collected,
      expenses: exp,
      net: collected - exp,
    };
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpected = (activeMembers ?? 0) * monthlyDue * 12;

  return res.json({
    year,
    totalCollected,
    totalExpected,
    totalExpenses,
    net: totalCollected - totalExpenses,
    monthlyBreakdown,
  });
});

router.get("/unpaid", async (req, res) => {
  const parsed = GetUnpaidMembersQueryParams.safeParse({
    month: Number(req.query.month),
    year: Number(req.query.year),
  });
  if (!parsed.success) return res.status(400).json({ error: "month and year are required" });
  const { month, year } = parsed.data;

  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));

  const paidIds = new Set(payments.map((p) => p.memberId));
  const unpaid = members.filter((m) => !paidIds.has(m.id));

  return res.json(unpaid.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.get("/tax-annual", async (req, res) => {
  const year = Number(req.query.year);
  if (!year || isNaN(year)) return res.status(400).json({ error: "year is required" });

  const [{ activeMembers }] = await db
    .select({ activeMembers: sql<number>`count(*)::int` })
    .from(membersTable)
    .where(eq(membersTable.status, "active"));

  const [{ totalMembers }] = await db
    .select({ totalMembers: sql<number>`count(*)::int` })
    .from(membersTable);

  const [settingsRow] = await db.select().from(settingsTable);
  const orgName = settingsRow?.organizationName ?? "Community Organization";

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.year, year));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.year, year));

  // Income by month
  const incomeByMonth = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthPayments = payments.filter((p) => p.month === month);
    return {
      month,
      collected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentCount: monthPayments.length,
    };
  });

  // Expenses by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cat = e.category;
    const existing = categoryMap.get(cat) ?? { total: 0, count: 0 };
    categoryMap.set(cat, { total: existing.total + Number(e.amount), count: existing.count + 1 });
  }
  const expensesByCategory = Array.from(categoryMap.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);

  // Quarterly breakdown
  const quarterMonths = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
  const quarterLabels = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
  const quarters = quarterMonths.map((months, i) => {
    const income = payments
      .filter((p) => months.includes(p.month))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const exp = expenses
      .filter((e) => months.includes(e.month))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { quarter: i + 1, label: quarterLabels[i]!, income, expenses: exp, net: income - exp };
  });

  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return res.json({
    year,
    orgName,
    totalIncome,
    totalExpenses,
    grossSurplus: totalIncome - totalExpenses,
    activeMembers: activeMembers ?? 0,
    totalMembers: totalMembers ?? 0,
    quarters,
    incomeByMonth,
    expensesByCategory,
  });
});

// Members payment report — full matrix for a given year
router.get("/members", async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const [settings, members, payments] = await Promise.all([
    db.select().from(settingsTable).limit(1),
    db.select().from(membersTable).orderBy(membersTable.registrationNumber),
    db.select().from(paymentsTable).where(eq(paymentsTable.year, year)),
  ]);

  const orgName = settings[0]?.orgName ?? "Al-Hikmah Community Center";

  // Index payments by memberId + month for O(1) lookup
  const payMap = new Map<string, typeof payments[0]>();
  for (const p of payments) {
    payMap.set(`${p.memberId}:${p.month}`, p);
  }

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const activeMembers = members.filter((m) => m.status === "active").length;
  // Max possible paid slots = active members * 12
  const maxSlots = activeMembers * 12;
  const totalPaidSlots = payments.length;
  const collectionRate = maxSlots > 0 ? Math.round((totalPaidSlots / maxSlots) * 100) : 0;

  const rows = members.map((m) => {
    const monthlyPayments = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const p = payMap.get(`${m.id}:${month}`);
      return {
        month,
        paid: !!p,
        amount: p ? Number(p.amount) : 0,
        paidDate: p ? p.paidDate ?? null : null,
      };
    });
    const totalPaidMonths = monthlyPayments.filter((x) => x.paid).length;
    const totalAmount = monthlyPayments.reduce((s, x) => s + x.amount, 0);
    return {
      id: m.id,
      registrationNumber: m.registrationNumber,
      name: m.name,
      phone: m.phone,
      status: m.status,
      joinDate: m.joinDate,
      monthlyPayments,
      totalPaidMonths,
      totalAmount,
    };
  });

  return res.json({
    year,
    orgName,
    totalMembers: members.length,
    activeMembers,
    totalCollected,
    collectionRate,
    members: rows,
  });
});

export { router as reportsRouter };
