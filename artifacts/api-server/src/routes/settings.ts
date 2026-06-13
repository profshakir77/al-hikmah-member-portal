import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function ensureSettings() {
  const [existing] = await db.select().from(settingsTable);
  if (!existing) {
    const [created] = await db
      .insert(settingsTable)
      .values({
        organizationName: "Community Organization",
        monthlyDueAmount: "10.00",
        whatsappAlertTemplate:
          "Dear {name}, your monthly contribution of {amount} {currency} for {month}/{year} is outstanding. Please pay at your earliest convenience. Thank you.",
        currency: "EUR",
      })
      .returning();
    return created!;
  }
  return existing;
}

router.get("/", async (_req, res) => {
  const settings = await ensureSettings();
  return res.json({
    ...settings,
    monthlyDueAmount: Number(settings.monthlyDueAmount),
  });
});

router.patch("/", async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const settings = await ensureSettings();
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.organizationName !== undefined) updates.organizationName = d.organizationName;
  if (d.monthlyDueAmount !== undefined) updates.monthlyDueAmount = String(d.monthlyDueAmount);
  if (d.whatsappAlertTemplate !== undefined) updates.whatsappAlertTemplate = d.whatsappAlertTemplate;
  if (d.currency !== undefined) updates.currency = d.currency;

  const [updated] = await db
    .update(settingsTable)
    .set(updates)
    .where(eq(settingsTable.id, settings.id))
    .returning();

  if (!updated) return res.status(500).json({ error: "Failed to update settings" });
  return res.json({ ...updated, monthlyDueAmount: Number(updated.monthlyDueAmount) });
});

export { router as settingsRouter };
