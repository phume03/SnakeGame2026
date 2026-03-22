import { Router } from "express";
import { leaderboard } from "../game/leaderboard.js";

const router = Router();

router.get("/", (_req, res) => {
  const limit = parseInt(String(_req.query.limit ?? "20"), 10) || 20;
  res.json(leaderboard.getTopScores(limit));
});

router.get("/matches", (_req, res) => {
  res.json(leaderboard.getRecentMatches());
});

router.get("/player/:playerName", (req, res) => {
  const scores = leaderboard.getPlayerScores(req.params.playerName);
  res.json(scores);
});

export default router;
