import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaderboardRouter from "./leaderboard";
import worldsRouter from "./worlds";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/worlds", worldsRouter);

export default router;
