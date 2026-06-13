import { Router } from "express";
import { db, membersTable, paymentsTable, settingsTable } from "@workspace/db";
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

  return res.json({
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    paidThisMonth: paidThisMonth ?? 0,
    unpaidThisMonth: Math.max(0, (activeMembers ?? 0) - (paidThisMonth ?? 0)),
    totalCollectedThisMonth: totalCollectedThisMonth ?? 0,
    totalCollectedThisYear: totalCollectedThisYear ?? 0,
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
  const expectedTotal = members.length * monthlyDue;

  return res.json({
    month,
    year,
    totalMembers: members.length,
    paid,
    unpaid: members.length - paid,
    totalCollected,
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

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const monthPayments = payments.filter((p) => p.month === m);
    return {
      month: m,
      year,
      paid: monthPayments.length,
      unpaid: Math.max(0, (activeMembers ?? 0) - monthPayments.length),
      collected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    };
  });

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpected = (activeMembers ?? 0) * monthlyDue * 12;

  return res.json({
    year,
    totalCollected,
    totalExpected,
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

export { router as reportsRouter };
