import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { membersRouter } from "./members";
import { paymentsRouter } from "./payments";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/members", membersRouter);
router.use("/payments", paymentsRouter);
router.use("/reports", reportsRouter);
router.use("/settings", settingsRouter);

export default router;
