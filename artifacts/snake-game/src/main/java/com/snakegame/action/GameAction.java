package com.snakegame.action;

import com.opensymphony.xwork2.ActionSupport;
import org.apache.struts2.convention.annotation.Action;
import org.apache.struts2.convention.annotation.Namespace;
import org.apache.struts2.convention.annotation.Result;
import org.apache.struts2.convention.annotation.Results;

@Namespace("/game")
@Results({
    @Result(name = "singleplayer", location = "/WEB-INF/jsp/game.jsp"),
    @Result(name = "multiplayer",  location = "/WEB-INF/jsp/game.jsp")
})
public class GameAction extends ActionSupport {

    private String mode;

    @Action(value = "single", results = {
        @Result(name = "success", location = "/WEB-INF/jsp/game.jsp")
    })
    public String single() {
        mode = "SINGLE";
        return SUCCESS;
    }

    @Action(value = "multi", results = {
        @Result(name = "success", location = "/WEB-INF/jsp/game.jsp")
    })
    public String multi() {
        mode = "MULTI";
        return SUCCESS;
    }

    public String getMode() { return mode; }
}
