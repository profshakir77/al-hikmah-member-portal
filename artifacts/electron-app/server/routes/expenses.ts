import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db.js";
import { expensesTable } from "../schema.js";

const router = Router();

router.get("/summary", async (req, res) => {
  const db = getDb();
  const month = req.query.month !== undefined ? Number(req.query.month) : undefined;
  const year = req.query.year !== undefined ? Number(req.query.year) : undefined;

  const conditions = [];
  if (month) conditions.push(eq(expensesTable.month, month));
  if (year) conditions.push(eq(expensesTable.year, year));

  const whereClause = conditions.length === 2 ? and(conditions[0]!, conditions[1]!) : conditions[0];
  const rows = whereClause
    ? await db.select().from(expensesTable).where(whereClause)
    : await db.select().from(expensesTable);

  const totalExpenses = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const e of rows) {
    const existing = categoryMap.get(e.category) ?? { total: 0, count: 0 };
    categoryMap.set(e.category, { total: existing.total + Number(e.amount), count: existing.count + 1 });
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({ category, total, count }));

  return res.json({ totalExpenses, byCategory, month: month ?? null, year: year ?? null });
});

router.get("/", async (req, res) => {
  const db = getDb();
  const month = req.query.month !== undefined ? Number(req.query.month) : undefined;
  const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
  const category = req.query.category as string | undefined;

  const conditions = [];
  if (month) conditions.push(eq(expensesTable.month, month));
  if (year) conditions.push(eq(expensesTable.year, year));
  if (category) conditions.push(eq(expensesTable.category, category));

  const whereClause = conditions.length > 0 ? conditions.reduce((acc, cond) => and(acc, cond)!) : undefined;
  const expenses = whereClause
    ? await db.select().from(expensesTable).where(whereClause)
    : await db.select().from(expensesTable);

  return res.json(expenses.map((e) => ({ ...e, amount: Number(e.amount), createdAt: e.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const db = getDb();
  const { title, amount, category, month, year, notes } = req.body;
  if (!title || !amount || !category || !month || !year) {
    return res.status(400).json({ error: "title, amount, category, month, year are required" });
  }
  const [expense] = await db.insert(expensesTable).values({
    title, amount: String(amount), category, month: Number(month), year: Number(year), notes: notes ?? null,
  }).returning();
  if (!expense) return res.status(500).json({ error: "Failed to create expense" });
  return res.status(201).json({ ...expense, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const updates: Record<string, unknown> = {};
  const d = req.body;
  if (d.title !== undefined) updates.title = d.title;
  if (d.amount !== undefined) updates.amount = String(d.amount);
  if (d.category !== undefined) updates.category = d.category;
  if (d.month !== undefined) updates.month = Number(d.month);
  if (d.year !== undefined) updates.year = Number(d.year);
  if (d.notes !== undefined) updates.notes = d.notes;

  const [expense] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  return res.json({ ...expense, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  return res.status(204).send();
});

export { router as expensesRouter };
