package com.snakegame.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.snakegame.game.GameWorld;
import com.snakegame.model.*;

import java.util.*;

/**
 * Converts game state to JSON for WebSocket transmission.
 */
public class JsonSerializer {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static String serializeGameState(GameWorld world) {
        try {
            Map<String, Object> state = new LinkedHashMap<>();
            state.put("type", "STATE");
            state.put("worldId", world.getWorldId());
            state.put("status", world.getStatus().name());
            state.put("level", world.getCurrentLevel());
            state.put("gridW", world.getGridW());
            state.put("gridH", world.getGridH());

            // Snakes
            List<Map<String, Object>> snakeList = new ArrayList<>();
            for (Snake s : world.getSnakes().values()) {
                Map<String, Object> sMap = new LinkedHashMap<>();
                sMap.put("id", s.getId());
                sMap.put("name", s.getPlayerName());
                sMap.put("type", s.getType().name());
                sMap.put("color", s.getColor());
                sMap.put("alive", s.isAlive());
                sMap.put("score", s.getScore());
                sMap.put("direction", s.getDirection().name());

                List<int[]> bodyArr = new ArrayList<>();
                for (Point p : s.getBodyList()) {
                    bodyArr.add(new int[]{p.getX(), p.getY()});
                }
                sMap.put("body", bodyArr);
                snakeList.add(sMap);
            }
            state.put("snakes", snakeList);

            // Apples
            List<Map<String, Object>> appleList = new ArrayList<>();
            for (Apple a : world.getApples()) {
                Map<String, Object> aMap = new LinkedHashMap<>();
                aMap.put("x", a.getPosition().getX());
                aMap.put("y", a.getPosition().getY());
                aMap.put("color", a.getColor());
                aMap.put("points", a.getPointValue());
                appleList.add(aMap);
            }
            state.put("apples", appleList);

            // Obstacles
            List<Map<String, Object>> obsList = new ArrayList<>();
            for (Obstacle obs : world.getObstacles()) {
                Map<String, Object> oMap = new LinkedHashMap<>();
                oMap.put("type", obs.getType().name());
                List<int[]> cells = new ArrayList<>();
                for (Point p : obs.getCells()) {
                    cells.add(new int[]{p.getX(), p.getY()});
                }
                oMap.put("cells", cells);
                obsList.add(oMap);
            }
            state.put("obstacles", obsList);

            return mapper.writeValueAsString(state);
        } catch (JsonProcessingException e) {
            return "{\"type\":\"ERROR\",\"message\":\"Serialization error\"}";
        }
    }

    public static String serializeGameOver(String winnerName) {
        try {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("type", "GAME_OVER");
            msg.put("winner", winnerName != null ? winnerName : "Nobody");
            return mapper.writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            return "{\"type\":\"GAME_OVER\"}";
        }
    }

    public static String serializeLevelComplete(int newLevel) {
        try {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("type", "LEVEL_COMPLETE");
            msg.put("newLevel", newLevel);
            return mapper.writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            return "{\"type\":\"LEVEL_COMPLETE\"}";
        }
    }

    public static String serializeMessage(String type, String message) {
        try {
            Map<String, Object> msg = new LinkedHashMap<>();
            msg.put("type", type);
            msg.put("message", message);
            return mapper.writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            return "{\"type\":\"" + type + "\"}";
        }
    }

    public static Map<String, Object> parseMessage(String json) {
        try {
            return mapper.readValue(json, Map.class);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}
