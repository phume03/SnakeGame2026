package com.snakegame.model;

import java.io.Serializable;
import java.util.List;

public class MatchRecord implements Serializable {
    private static final long serialVersionUID = 1L;

    private String worldId;
    private List<String> playerNames;
    private String winnerName;
    private String gameMode;
    private String playedAt;

    public MatchRecord() {}

    public MatchRecord(String worldId, List<String> playerNames, String winnerName, String gameMode, String playedAt) {
        this.worldId = worldId;
        this.playerNames = playerNames;
        this.winnerName = winnerName;
        this.gameMode = gameMode;
        this.playedAt = playedAt;
    }

    public String getWorldId() { return worldId; }
    public void setWorldId(String worldId) { this.worldId = worldId; }
    public List<String> getPlayerNames() { return playerNames; }
    public void setPlayerNames(List<String> playerNames) { this.playerNames = playerNames; }
    public String getWinnerName() { return winnerName; }
    public void setWinnerName(String winnerName) { this.winnerName = winnerName; }
    public String getGameMode() { return gameMode; }
    public void setGameMode(String gameMode) { this.gameMode = gameMode; }
    public String getPlayedAt() { return playedAt; }
    public void setPlayedAt(String playedAt) { this.playedAt = playedAt; }
}
