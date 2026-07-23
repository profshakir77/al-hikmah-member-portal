import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import { membersTable, paymentsTable } from "../schema.js";

const router = Router();

router.get("/status", async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) return res.status(400).json({ error: "month and year are required" });

  const db = getDb();
  const members = await db.select().from(membersTable).where(eq(membersTable.status, "active"));
  const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.month, month), eq(paymentsTable.year, year)));
  const paymentMap = new Map(payments.map((p) => [p.memberId, p]));

  return res.json(members.map((m) => {
    const payment = paymentMap.get(m.id);
    return {
      memberId: m.id, registrationNumber: m.registrationNumber, name: m.name, phone: m.phone,
      paid: !!payment, amount: payment ? Number(payment.amount) : null,
      paidAt: payment ? payment.paidAt.toISOString() : null,
      paymentId: payment ? payment.id : null, month, year,
    };
  }));
});

router.get("/", async (req, res) => {
  const db = getDb();
  const month = req.query.month !== undefined ? Number(req.query.month) : undefined;
  const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
  const memberId = req.query.memberId !== undefined ? Number(req.query.memberId) : undefined;

  const conditions = [];
  if (month) conditions.push(eq(paymentsTable.month, month));
  if (year) conditions.push(eq(paymentsTable.year, year));
  if (memberId) conditions.push(eq(paymentsTable.memberId, memberId));

  let results;
  const base = db.select({
    id: paymentsTable.id, memberId: paymentsTable.memberId,
    memberName: membersTable.name, memberRegistrationNumber: membersTable.registrationNumber,
    amount: paymentsTable.amount, month: paymentsTable.month, year: paymentsTable.year,
    notes: paymentsTable.notes, paidAt: paymentsTable.paidAt,
  }).from(paymentsTable).innerJoin(membersTable, eq(paymentsTable.memberId, membersTable.id));

  if (conditions.length === 0) {
    results = await base.orderBy(desc(paymentsTable.paidAt));
  } else {
    const where = conditions.reduce((acc, cond) => and(acc, cond)!);
    results = await base.where(where).orderBy(desc(paymentsTable.paidAt));
  }

  return res.json(results.map((p) => ({ ...p, amount: Number(p.amount), paidAt: p.paidAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const db = getDb();
  const { memberId, amount, month, year, notes, paidAt } = req.body;
  if (!memberId || !amount || !month || !year) {
    return res.status(400).json({ error: "memberId, amount, month, year are required" });
  }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, Number(memberId)));
  if (!member) return res.status(404).json({ error: "Member not found" });

  const existing = await db.select().from(paymentsTable).where(
    and(eq(paymentsTable.memberId, Number(memberId)), eq(paymentsTable.month, Number(month)), eq(paymentsTable.year, Number(year)))
  );
  if (existing.length > 0) return res.status(409).json({ error: "Payment already recorded for this member for the given month/year" });

  const [payment] = await db.insert(paymentsTable).values({
    memberId: Number(memberId), amount: String(amount), month: Number(month), year: Number(year),
    notes: notes ?? null, ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
  }).returning();

  if (!payment) return res.status(500).json({ error: "Failed to record payment" });
  return res.status(201).json({
    ...payment, memberName: member.name, memberRegistrationNumber: member.registrationNumber,
    amount: Number(payment.amount), paidAt: payment.paidAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  return res.status(204).send();
});

export { router as paymentsRouter };
