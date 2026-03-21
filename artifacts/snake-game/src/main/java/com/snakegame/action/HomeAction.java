package com.snakegame.action;

import com.opensymphony.xwork2.ActionSupport;
import com.snakegame.game.WorldManager;
import com.snakegame.model.LeaderboardEntry;
import com.snakegame.util.DatabaseManager;
import org.apache.struts2.convention.annotation.Action;
import org.apache.struts2.convention.annotation.Namespace;
import org.apache.struts2.convention.annotation.Result;
import org.apache.struts2.convention.annotation.Results;

import java.util.List;

@Namespace("/")
@Results({
    @Result(name = "success", location = "/WEB-INF/jsp/home.jsp")
})
public class HomeAction extends ActionSupport {

    private List<LeaderboardEntry> topScores;
    private int activeWorlds;

    @Action(value = "index", results = {
        @Result(name = "success", location = "/WEB-INF/jsp/home.jsp")
    })
    public String execute() {
        topScores = DatabaseManager.getInstance().getTopScores(10);
        activeWorlds = WorldManager.getInstance().getActiveWorldCount();
        return SUCCESS;
    }

    public List<LeaderboardEntry> getTopScores() { return topScores; }
    public int getActiveWorlds() { return activeWorlds; }
}
