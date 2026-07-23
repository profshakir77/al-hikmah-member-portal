import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { authRouter } from "./auth.js";
import { membersRouter } from "./members.js";
import { paymentsRouter } from "./payments.js";
import { expensesRouter } from "./expenses.js";
import { contributionsRouter } from "./contributions.js";
import { reportsRouter } from "./reports.js";
import { settingsRouter } from "./settings.js";
import { usersRouter } from "./users.js";
import { backupRouter } from "./backup.js";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
// All other routes require authentication
router.use("/members", requireAuth, membersRouter);
router.use("/payments", requireAuth, paymentsRouter);
router.use("/expenses", requireAuth, expensesRouter);
router.use("/contributions", requireAuth, contributionsRouter);
router.use("/reports", requireAuth, reportsRouter);
router.use("/settings", requireAuth, settingsRouter);
router.use("/users", requireAuth, usersRouter);
router.use("/backup", requireAuth, backupRouter);

export default router;
