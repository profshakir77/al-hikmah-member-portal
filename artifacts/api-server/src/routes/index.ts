import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { membersRouter } from "./members";
import { paymentsRouter } from "./payments";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";
import { expensesRouter } from "./expenses";
import { usersRouter } from "./users";
import { backupRouter } from "./backup";
import { contributionsRouter } from "./contributions";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use(requireAuth);

router.use("/members", membersRouter);
router.use("/payments", paymentsRouter);
router.use("/reports", reportsRouter);
router.use("/settings", settingsRouter);
router.use("/expenses", expensesRouter);
router.use("/users", usersRouter);
router.use("/backup", backupRouter);
router.use("/contributions", contributionsRouter);

export default router;
