import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
  ListExpensesQueryParams,
  GetExpenseSummaryQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/summary", async (req, res) => {
  const parsed = GetExpenseSummaryQueryParams.safeParse({
    month: req.query.month !== undefined ? Number(req.query.month) : undefined,
    year: req.query.year !== undefined ? Number(req.query.year) : undefined,
  });
  const params = parsed.success ? parsed.data : {};
  const { month, year } = params as { month?: number; year?: number };

  const conditions = [];
  if (month) conditions.push(eq(expensesTable.month, month));
  if (year) conditions.push(eq(expensesTable.year, year));

  const whereClause = conditions.length === 2
    ? and(conditions[0]!, conditions[1]!)
    : conditions[0];

  const rows = whereClause
    ? await db.select().from(expensesTable).where(whereClause)
    : await db.select().from(expensesTable);

  const totalExpenses = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const e of rows) {
    const existing = categoryMap.get(e.category) ?? { total: 0, count: 0 };
    categoryMap.set(e.category, { total: existing.total + Number(e.amount), count: existing.count + 1 });
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, { total, count }]) => ({
    category,
    total,
    count,
  }));

  return res.json({
    totalExpenses,
    byCategory,
    month: month ?? null,
    year: year ?? null,
  });
});

router.get("/", async (req, res) => {
  const parsed = ListExpensesQueryParams.safeParse({
    month: req.query.month !== undefined ? Number(req.query.month) : undefined,
    year: req.query.year !== undefined ? Number(req.query.year) : undefined,
    category: req.query.category,
  });
  const params = parsed.success ? parsed.data : {};
  const { month, year, category } = params as { month?: number; year?: number; category?: string };

  const conditions = [];
  if (month) conditions.push(eq(expensesTable.month, month));
  if (year) conditions.push(eq(expensesTable.year, year));
  if (category) conditions.push(eq(expensesTable.category, category));

  let expenses;
  if (conditions.length === 0) {
    expenses = await db.select().from(expensesTable);
  } else {
    const whereClause = conditions.reduce((acc, cond) => and(acc, cond)!);
    expenses = await db.select().from(expensesTable).where(whereClause);
  }

  return res.json(
    expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

router.post("/", async (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { title, amount, category, month, year, notes } = parsed.data;

  const [expense] = await db
    .insert(expensesTable)
    .values({ title, amount: String(amount), category, month, year, notes: notes ?? null })
    .returning();

  if (!expense) return res.status(500).json({ error: "Failed to create expense" });
  return res.status(201).json({ ...expense, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const paramParsed = UpdateExpenseParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) return res.status(400).json({ error: "Invalid ID" });

  const bodyParsed = UpdateExpenseBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid input" });

  const updates: Record<string, unknown> = {};
  const d = bodyParsed.data;
  if (d.title !== undefined) updates.title = d.title;
  if (d.amount !== undefined) updates.amount = String(d.amount);
  if (d.category !== undefined) updates.category = d.category;
  if (d.month !== undefined) updates.month = d.month;
  if (d.year !== undefined) updates.year = d.year;
  if (d.notes !== undefined) updates.notes = d.notes;

  const [expense] = await db
    .update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, paramParsed.data.id))
    .returning();

  if (!expense) return res.status(404).json({ error: "Expense not found" });
  return res.json({ ...expense, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteExpenseParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(expensesTable).where(eq(expensesTable.id, parsed.data.id));
  return res.status(204).send();
});

export { router as expensesRouter };
