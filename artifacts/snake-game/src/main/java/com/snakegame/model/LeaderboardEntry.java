package com.snakegame.model;

import java.io.Serializable;

public class LeaderboardEntry implements Serializable {
    private static final long serialVersionUID = 1L;

    private String playerName;
    private int score;
    private int level;
    private String gameMode;
    private String playedAt;

    public LeaderboardEntry() {}

    public LeaderboardEntry(String playerName, int score, int level, String gameMode, String playedAt) {
        this.playerName = playerName;
        this.score = score;
        this.level = level;
        this.gameMode = gameMode;
        this.playedAt = playedAt;
    }

    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }
    public String getGameMode() { return gameMode; }
    public void setGameMode(String gameMode) { this.gameMode = gameMode; }
    public String getPlayedAt() { return playedAt; }
    public void setPlayedAt(String playedAt) { this.playedAt = playedAt; }
}
