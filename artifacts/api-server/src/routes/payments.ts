import { Router } from "express";
import { db, membersTable, paymentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreatePaymentBody,
  DeletePaymentParams,
  ListPaymentsQueryParams,
  GetPaymentStatusQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/status", async (req, res) => {
  const parsed = GetPaymentStatusQueryParams.safeParse({
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

  const paymentMap = new Map(payments.map((p) => [p.memberId, p]));

  const statuses = members.map((m) => {
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

  return res.json(statuses);
});

router.get("/", async (req, res) => {
  const parsed = ListPaymentsQueryParams.safeParse({
    month: req.query.month !== undefined ? Number(req.query.month) : undefined,
    year: req.query.year !== undefined ? Number(req.query.year) : undefined,
    memberId: req.query.memberId !== undefined ? Number(req.query.memberId) : undefined,
  });
  const params = parsed.success ? parsed.data : {};

  const conditions = [];
  if (params.month) conditions.push(eq(paymentsTable.month, params.month));
  if (params.year) conditions.push(eq(paymentsTable.year, params.year));
  if (params.memberId) conditions.push(eq(paymentsTable.memberId, params.memberId));

  let results;
  if (conditions.length === 0) {
    results = await db
      .select({
        id: paymentsTable.id,
        memberId: paymentsTable.memberId,
        memberName: membersTable.name,
        memberRegistrationNumber: membersTable.registrationNumber,
        amount: paymentsTable.amount,
        month: paymentsTable.month,
        year: paymentsTable.year,
        notes: paymentsTable.notes,
        paidAt: paymentsTable.paidAt,
      })
      .from(paymentsTable)
      .innerJoin(membersTable, eq(paymentsTable.memberId, membersTable.id))
      .orderBy(desc(paymentsTable.paidAt));
  } else {
    const whereClause = conditions.reduce((acc, cond) => and(acc, cond)!);
    results = await db
      .select({
        id: paymentsTable.id,
        memberId: paymentsTable.memberId,
        memberName: membersTable.name,
        memberRegistrationNumber: membersTable.registrationNumber,
        amount: paymentsTable.amount,
        month: paymentsTable.month,
        year: paymentsTable.year,
        notes: paymentsTable.notes,
        paidAt: paymentsTable.paidAt,
      })
      .from(paymentsTable)
      .innerJoin(membersTable, eq(paymentsTable.memberId, membersTable.id))
      .where(whereClause)
      .orderBy(desc(paymentsTable.paidAt));
  }

  return res.json(
    results.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { memberId, amount, month, year, notes, paidAt } = parsed.data;

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, memberId));
  if (!member) return res.status(404).json({ error: "Member not found" });

  const existing = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.memberId, memberId),
        eq(paymentsTable.month, month),
        eq(paymentsTable.year, year)
      )
    );
  if (existing.length > 0) {
    return res.status(409).json({ error: "Payment already recorded for this member for the given month/year" });
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      memberId,
      amount: String(amount),
      month,
      year,
      notes: notes ?? null,
      ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
    })
    .returning();

  if (!payment) return res.status(500).json({ error: "Failed to record payment" });

  return res.status(201).json({
    ...payment,
    memberName: member.name,
    memberRegistrationNumber: member.registrationNumber,
    amount: Number(payment.amount),
    paidAt: payment.paidAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeletePaymentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(paymentsTable).where(eq(paymentsTable.id, parsed.data.id));
  return res.status(204).send();
});

export { router as paymentsRouter };
