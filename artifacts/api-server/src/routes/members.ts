import { Router } from "express";
import { db, membersTable, paymentsTable } from "@workspace/db";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import {
  CreateMemberBody,
  UpdateMemberParams,
  UpdateMemberBody,
  DeleteMemberParams,
  GetMemberParams,
  GetMemberPaymentsParams,
  ListMembersQueryParams,
} from "@workspace/api-zod";

const router = Router();

function generateRegistrationNumber(id: number): string {
  return `MEM-${String(id).padStart(4, "0")}`;
}

function formatMonth(m: number): string {
  return [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ][m - 1] ?? String(m);
}

router.get("/", async (req, res) => {
  const parsed = ListMembersQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const { search, status } = params as { search?: string; status?: string };

  let query = db.select().from(membersTable).$dynamic();

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(membersTable.name, `%${search}%`),
        ilike(membersTable.registrationNumber, `%${search}%`),
        ilike(membersTable.phone, `%${search}%`)
      )
    );
  }
  if (status === "active" || status === "inactive") {
    conditions.push(eq(membersTable.status, status));
  }

  if (conditions.length > 0) {
    query = query.where(conditions.length === 1 ? conditions[0]! : sql`${conditions[0]} AND ${conditions[1]}`);
  }

  const members = await query.orderBy(desc(membersTable.createdAt));
  return res.json(members.map((m) => ({ ...m, joinDate: m.joinDate, createdAt: m.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { name, phone, email, address, notes, joinDate } = parsed.data;

  const [counter] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membersTable);
  const nextId = (counter?.count ?? 0) + 1;
  const registrationNumber = generateRegistrationNumber(nextId);

  const [member] = await db
    .insert(membersTable)
    .values({
      registrationNumber,
      name,
      phone,
      email: email ?? null,
      address: address ?? null,
      notes: notes ?? null,
      status: "active",
      joinDate: joinDate ?? new Date().toISOString().split("T")[0]!,
    })
    .returning();

  if (!member) return res.status(500).json({ error: "Failed to create member" });
  return res.status(201).json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const parsed = GetMemberParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.id));

  if (!member) return res.status(404).json({ error: "Member not found" });
  return res.json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateMemberParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid ID" });

  const bodyParsed = UpdateMemberBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: "Invalid input", details: bodyParsed.error.issues });
  }

  const updates: Record<string, unknown> = {};
  const d = bodyParsed.data;
  if (d.name !== undefined) updates.name = d.name;
  if (d.phone !== undefined) updates.phone = d.phone;
  if (d.email !== undefined) updates.email = d.email;
  if (d.address !== undefined) updates.address = d.address;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.status !== undefined) updates.status = d.status;
  if (d.joinDate !== undefined) updates.joinDate = d.joinDate;

  const [member] = await db
    .update(membersTable)
    .set(updates)
    .where(eq(membersTable.id, paramParsed.data.id))
    .returning();

  if (!member) return res.status(404).json({ error: "Member not found" });
  return res.json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteMemberParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(membersTable).where(eq(membersTable.id, parsed.data.id));
  return res.status(204).send();
});

router.get("/:id/payments", async (req, res) => {
  const parsed = GetMemberPaymentsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  const results = await db
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
    .where(eq(paymentsTable.memberId, parsed.data.id))
    .orderBy(desc(paymentsTable.year), desc(paymentsTable.month));

  return res.json(
    results.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paidAt: p.paidAt.toISOString(),
    }))
  );
});

export { router as membersRouter, formatMonth };
