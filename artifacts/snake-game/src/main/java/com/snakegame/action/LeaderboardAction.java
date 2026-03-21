package com.snakegame.action;

import com.opensymphony.xwork2.ActionSupport;
import com.snakegame.model.LeaderboardEntry;
import com.snakegame.model.MatchRecord;
import com.snakegame.game.WorldManager;
import com.snakegame.util.DatabaseManager;
import org.apache.struts2.convention.annotation.Action;
import org.apache.struts2.convention.annotation.Namespace;
import org.apache.struts2.convention.annotation.Result;
import org.apache.struts2.convention.annotation.Results;

import java.util.List;

@Namespace("/leaderboard")
@Results({
    @Result(name = "success", location = "/WEB-INF/jsp/leaderboard.jsp")
})
public class LeaderboardAction extends ActionSupport {

    private List<LeaderboardEntry> topScores;
    private List<MatchRecord> recentMatches;
    private String playerName;
    private List<LeaderboardEntry> playerHistory;

    @Action(value = "top", results = {
        @Result(name = "success", location = "/WEB-INF/jsp/leaderboard.jsp")
    })
    public String top() {
        topScores = DatabaseManager.getInstance().getTopScores(20);
        recentMatches = WorldManager.getInstance().getAllMatches();
        return SUCCESS;
    }

    @Action(value = "player", results = {
        @Result(name = "success", location = "/WEB-INF/jsp/leaderboard.jsp")
    })
    public String player() {
        if (playerName != null && !playerName.trim().isEmpty()) {
            playerHistory = DatabaseManager.getInstance().getPlayerScores(playerName.trim());
        }
        topScores = DatabaseManager.getInstance().getTopScores(10);
        recentMatches = WorldManager.getInstance().getAllMatches();
        return SUCCESS;
    }

    public List<LeaderboardEntry> getTopScores() { return topScores; }
    public List<MatchRecord> getRecentMatches() { return recentMatches; }
    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }
    public List<LeaderboardEntry> getPlayerHistory() { return playerHistory; }
}
