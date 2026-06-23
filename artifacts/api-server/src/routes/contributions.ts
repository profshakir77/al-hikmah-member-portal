import { Router } from "express";
import { db, contributionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// List contributions (filter by type, year, month)
router.get("/", async (req, res) => {
  const type = req.query.type as string | undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  const conditions = [];
  if (type) conditions.push(eq(contributionsTable.type, type));
  if (year) conditions.push(eq(contributionsTable.year, year));
  if (month) conditions.push(eq(contributionsTable.month, month));

  const rows = conditions.length > 0
    ? await db.select().from(contributionsTable)
        .where(conditions.length === 1 ? conditions[0]! : and(...(conditions as [typeof conditions[0], ...typeof conditions])))
        .orderBy(desc(contributionsTable.date))
    : await db.select().from(contributionsTable).orderBy(desc(contributionsTable.date));

  return res.json(rows);
});

// Create contribution
router.post("/", async (req, res) => {
  const { name, phone, amount, date, type, reference, notes, year, month } = req.body;
  const [row] = await db.insert(contributionsTable).values({
    name,
    phone: phone || null,
    amount: String(amount),
    date,
    type: type ?? "participant",
    reference: reference || null,
    notes: notes || null,
    year: Number(year),
    month: month ? Number(month) : null,
  }).returning();
  return res.status(201).json(row);
});

// Update contribution
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, amount, date, type, reference, notes, year, month } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (amount !== undefined) updates.amount = String(amount);
  if (date !== undefined) updates.date = date;
  if (type !== undefined) updates.type = type;
  if (reference !== undefined) updates.reference = reference;
  if (notes !== undefined) updates.notes = notes;
  if (year !== undefined) updates.year = Number(year);
  if (month !== undefined) updates.month = month ? Number(month) : null;
  const [row] = await db.update(contributionsTable).set(updates).where(eq(contributionsTable.id, id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

// Delete contribution
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
  return res.status(204).send();
});

export { router as contributionsRouter };
