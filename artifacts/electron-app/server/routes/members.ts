import { Router } from "express";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { membersTable, paymentsTable } from "../schema.js";

const router = Router();

function generateRegistrationNumber(id: number): string {
  return `MEM-${String(id).padStart(4, "0")}`;
}

router.get("/", async (req, res) => {
  const db = getDb();
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

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

  let query = db.select().from(membersTable).$dynamic();
  if (conditions.length === 1) query = query.where(conditions[0]!);
  else if (conditions.length > 1) query = query.where(sql`${conditions[0]} AND ${conditions[1]}`);

  const members = await query.orderBy(desc(membersTable.createdAt));
  return res.json(members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const db = getDb();
  const { name, phone, email, address, notes, joinDate } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

  const [counter] = await db.select({ count: sql<number>`count(*)::int` }).from(membersTable);
  const nextId = (counter?.count ?? 0) + 1;
  const registrationNumber = generateRegistrationNumber(nextId);

  const [member] = await db.insert(membersTable).values({
    registrationNumber,
    name,
    phone,
    email: email ?? null,
    address: address ?? null,
    notes: notes ?? null,
    status: "active",
    joinDate: joinDate ?? new Date().toISOString().split("T")[0]!,
  }).returning();

  if (!member) return res.status(500).json({ error: "Failed to create member" });
  return res.status(201).json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) return res.status(404).json({ error: "Member not found" });
  return res.json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const updates: Record<string, unknown> = {};
  const d = req.body;
  if (d.name !== undefined) updates.name = d.name;
  if (d.phone !== undefined) updates.phone = d.phone;
  if (d.email !== undefined) updates.email = d.email;
  if (d.address !== undefined) updates.address = d.address;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.status !== undefined) updates.status = d.status;
  if (d.joinDate !== undefined) updates.joinDate = d.joinDate;

  const [member] = await db.update(membersTable).set(updates).where(eq(membersTable.id, id)).returning();
  if (!member) return res.status(404).json({ error: "Member not found" });
  return res.json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  await db.delete(membersTable).where(eq(membersTable.id, id));
  return res.status(204).send();
});

router.get("/:id/payments", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const results = await db.select({
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
    .where(eq(paymentsTable.memberId, id))
    .orderBy(desc(paymentsTable.year), desc(paymentsTable.month));

  return res.json(results.map((p) => ({ ...p, amount: Number(p.amount), paidAt: p.paidAt.toISOString() })));
});

export { router as membersRouter };
