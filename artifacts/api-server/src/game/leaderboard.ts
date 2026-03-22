import type { LeaderboardEntry, MatchRecord } from "./types.js";

class LeaderboardStore {
  private static instance: LeaderboardStore;
  private scores: LeaderboardEntry[] = [];
  private matches: MatchRecord[] = [];

  static getInstance(): LeaderboardStore {
    if (!LeaderboardStore.instance) {
      LeaderboardStore.instance = new LeaderboardStore();
    }
    return LeaderboardStore.instance;
  }

  saveScore(entry: Omit<LeaderboardEntry, "playedAt">): void {
    this.scores.push({
      ...entry,
      playedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    });
  }

  getTopScores(limit = 20): LeaderboardEntry[] {
    return [...this.scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getPlayerScores(playerName: string): LeaderboardEntry[] {
    return this.scores
      .filter((e) => e.playerName === playerName)
      .sort((a, b) => b.score - a.score);
  }

  recordMatch(record: Omit<MatchRecord, "playedAt">): void {
    this.matches.push({
      ...record,
      playedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    });
  }

  getRecentMatches(limit = 50): MatchRecord[] {
    return [...this.matches].reverse().slice(0, limit);
  }
}

export const leaderboard = LeaderboardStore.getInstance();
