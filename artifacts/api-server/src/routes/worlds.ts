import { Router } from "express";
import { worldManager } from "../game/worldManager.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(worldManager.getStats());
});

export default router;
