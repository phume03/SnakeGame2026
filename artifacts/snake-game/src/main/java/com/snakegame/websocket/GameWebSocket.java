package com.snakegame.websocket;

import com.snakegame.game.GameWorld;
import com.snakegame.game.WorldManager;
import com.snakegame.util.DatabaseManager;
import com.snakegame.util.JsonSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket endpoint for real-time game communication.
 * URL: /ws/game
 *
 * Client connects and sends:
 * { "action": "JOIN_SINGLE", "playerName": "Alice" }
 * { "action": "JOIN_MULTI",  "playerName": "Bob" }
 * { "action": "START" }
 * { "action": "INPUT", "direction": "UP" | "DOWN" | "LEFT" | "RIGHT" }
 * { "action": "WARP",  "direction": "UP" | "DOWN" | "LEFT" | "RIGHT" }
 *
 * Server sends game state updates as JSON.
 */
@ServerEndpoint(value = "/ws/game")
public class GameWebSocket implements GameWorld.GameEventListener {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocket.class);

    // Map sessionId -> WebSocket session
    private static final Map<String, Session> sessions = new ConcurrentHashMap<>();

    private Session wsSession;
    private String playerName;
    private String worldId;

    @OnOpen
    public void onOpen(Session session) {
        this.wsSession = session;
        sessions.put(session.getId(), session);
        log.info("WebSocket opened: {}", session.getId());
        send("{\"type\":\"CONNECTED\",\"sessionId\":\"" + session.getId() + "\"}");
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        Map<String, Object> msg = JsonSerializer.parseMessage(message);
        String action = (String) msg.get("action");
        if (action == null) return;

        switch (action) {
            case "JOIN_SINGLE":
                handleJoinSingle(msg);
                break;
            case "JOIN_MULTI":
                handleJoinMulti(msg);
                break;
            case "START":
                handleStart();
                break;
            case "INPUT":
                handleInput(msg);
                break;
            default:
                log.warn("Unknown action: {}", action);
        }
    }

    private void handleJoinSingle(Map<String, Object> msg) {
        playerName = sanitize((String) msg.get("playerName"));
        if (playerName == null || playerName.isEmpty()) playerName = "Player";

        GameWorld world = WorldManager.getInstance().createSinglePlayerWorld(wsSession.getId(), playerName);
        this.worldId = world.getWorldId();
        world.addListener(this);
        send(JsonSerializer.serializeMessage("JOINED", "Joined single-player game as " + playerName));
        log.info("{} joined single-player world {}", playerName, worldId);
    }

    private void handleJoinMulti(Map<String, Object> msg) {
        playerName = sanitize((String) msg.get("playerName"));
        if (playerName == null || playerName.isEmpty()) playerName = "Player";

        GameWorld world = WorldManager.getInstance().joinMultiplayer(wsSession.getId(), playerName);
        this.worldId = world.getWorldId();
        world.addListener(this);
        
        int count = world.getPlayerCount();
        send(JsonSerializer.serializeMessage("JOINED",
            "Joined multiplayer world " + worldId + ". Players: " + count + "/3"));

        // Auto-start when 3 players have joined
        if (world.isFull()) {
            world.startGame();
            broadcastToWorld(worldId, JsonSerializer.serializeMessage("STARTING", "World is full — starting!"));
        }
        log.info("{} joined multiplayer world {} ({}/3)", playerName, worldId, count);
    }

    private void handleStart() {
        GameWorld world = WorldManager.getInstance().getWorldForSession(wsSession.getId());
        if (world == null) { send(JsonSerializer.serializeMessage("ERROR", "Not in a game")); return; }
        if (world.getMode() == GameWorld.GameMode.MULTIPLAYER) {
            send(JsonSerializer.serializeMessage("INFO", "Multiplayer starts when 3 players join"));
            return;
        }
        if (world.getStatus() == GameWorld.GameStatus.WAITING) {
            world.startGame();
        }
    }

    private void handleInput(Map<String, Object> msg) {
        GameWorld world = WorldManager.getInstance().getWorldForSession(wsSession.getId());
        if (world == null) return;
        String dir = (String) msg.get("direction");
        if (dir != null) world.handleInput(wsSession.getId(), dir);
    }

    @OnClose
    public void onClose(Session session, CloseReason reason) {
        sessions.remove(session.getId());
        GameWorld world = WorldManager.getInstance().getWorldForSession(session.getId());
        if (world != null) world.removeListener(this);
        WorldManager.getInstance().removeSession(session.getId());
        log.info("WebSocket closed: {} reason: {}", session.getId(), reason.getReasonPhrase());
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        log.error("WebSocket error for session {}", session.getId(), throwable);
    }

    // --- GameEventListener ---

    @Override
    public void onStateUpdate(GameWorld world) {
        send(JsonSerializer.serializeGameState(world));
    }

    @Override
    public void onGameOver(GameWorld world, String winnerName) {
        // Save scores to leaderboard
        for (Map.Entry<String, com.snakegame.model.Snake> entry : world.getSnakes().entrySet()) {
            com.snakegame.model.Snake snake = entry.getValue();
            if (snake.getType() == com.snakegame.model.Snake.SnakeType.PLAYER) {
                DatabaseManager.getInstance().saveScore(
                    snake.getPlayerName(), snake.getScore(),
                    world.getCurrentLevel(), world.getMode().name());
            }
        }

        WorldManager.getInstance().recordMatch(
            world.getWorldId(), world.getAllPlayerNames(),
            winnerName, world.getMode().name());

        broadcastToWorld(world.getWorldId(), JsonSerializer.serializeGameOver(winnerName));
    }

    @Override
    public void onLevelComplete(GameWorld world, int newLevel) {
        broadcastToWorld(world.getWorldId(), JsonSerializer.serializeLevelComplete(newLevel));
    }

    // --- Helpers ---

    private void send(String message) {
        try {
            if (wsSession != null && wsSession.isOpen()) {
                wsSession.getBasicRemote().sendText(message);
            }
        } catch (IOException e) {
            log.error("Failed to send message", e);
        }
    }

    private static void broadcastToWorld(String worldId, String message) {
        GameWorld world = WorldManager.getInstance().getWorld(worldId);
        if (world == null) return;
        for (String sid : world.getSnakes().keySet()) {
            Session s = sessions.get(sid);
            if (s != null && s.isOpen()) {
                try {
                    s.getBasicRemote().sendText(message);
                } catch (IOException e) {
                    log.error("Failed to broadcast to session {}", sid, e);
                }
            }
        }
    }

    private static String sanitize(String input) {
        if (input == null) return null;
        return input.replaceAll("[^a-zA-Z0-9 _-]", "").trim().substring(0, Math.min(input.length(), 20));
    }
}
