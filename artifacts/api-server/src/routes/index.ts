import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sketchesRouter from "./sketches";
import geminiRouter from "./gemini";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sketchesRouter);
router.use(geminiRouter);
router.use(paymentsRouter);

export default router;
