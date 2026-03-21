package com.snakegame.game;

import com.snakegame.model.MatchRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Singleton managing all active game worlds.
 * Handles matchmaking: for every 3 players a new world is created.
 */
public class WorldManager {

    private static final Logger log = LoggerFactory.getLogger(WorldManager.class);

    private static volatile WorldManager instance;

    private final Map<String, GameWorld> worlds = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToWorld = new ConcurrentHashMap<>(); // sessionId -> worldId
    private final AtomicInteger worldCounter = new AtomicInteger(0);

    // Track match history per player name
    private final Map<String, List<MatchRecord>> playerHistory = new ConcurrentHashMap<>();
    private final List<MatchRecord> allMatches = Collections.synchronizedList(new ArrayList<>());

    private WorldManager() {}

    public static WorldManager getInstance() {
        if (instance == null) {
            synchronized (WorldManager.class) {
                if (instance == null) instance = new WorldManager();
            }
        }
        return instance;
    }

    // --- Single Player ---

    public synchronized GameWorld createSinglePlayerWorld(String sessionId, String playerName) {
        String wid = "sp-" + worldCounter.incrementAndGet();
        GameWorld world = new GameWorld(wid, GameWorld.GameMode.SINGLE_PLAYER);
        world.addPlayer(sessionId, playerName);
        worlds.put(wid, world);
        sessionToWorld.put(sessionId, wid);
        log.info("Created single-player world {} for {}", wid, playerName);
        return world;
    }

    // --- Multiplayer Matchmaking ---

    /**
     * Join the multiplayer queue. Finds or creates a waiting world with < 3 players.
     * Per spec: every 3 players get their own world.
     * Returns the world the player joined.
     */
    public synchronized GameWorld joinMultiplayer(String sessionId, String playerName) {
        // Find an existing waiting world that isn't full
        GameWorld target = null;
        for (GameWorld w : worlds.values()) {
            if (w.getMode() == GameWorld.GameMode.MULTIPLAYER
                    && w.getStatus() == GameWorld.GameStatus.WAITING
                    && !w.isFull()) {
                target = w;
                break;
            }
        }

        if (target == null) {
            // Create new world
            String wid = "mp-" + worldCounter.incrementAndGet();
            target = new GameWorld(wid, GameWorld.GameMode.MULTIPLAYER);
            worlds.put(wid, target);
            log.info("Created new multiplayer world {}", wid);
        }

        target.addPlayer(sessionId, playerName);
        sessionToWorld.put(sessionId, target.getWorldId());
        log.info("Player {} joined world {}, count={}", playerName, target.getWorldId(), target.getPlayerCount());
        return target;
    }

    public GameWorld getWorldForSession(String sessionId) {
        String wid = sessionToWorld.get(sessionId);
        return wid != null ? worlds.get(wid) : null;
    }

    public GameWorld getWorld(String worldId) {
        return worlds.get(worldId);
    }

    public void removeSession(String sessionId) {
        String wid = sessionToWorld.remove(sessionId);
        if (wid != null) {
            GameWorld world = worlds.get(wid);
            if (world != null) {
                world.removePlayer(sessionId);
                if (world.getPlayerCount() == 0) {
                    world.stop();
                    worlds.remove(wid);
                    log.info("Removed empty world {}", wid);
                }
            }
        }
    }

    public void recordMatch(String worldId, List<String> players, String winner, String mode) {
        String now = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
        MatchRecord record = new MatchRecord(worldId, new ArrayList<>(players), winner, mode, now);
        allMatches.add(record);

        for (String p : players) {
            playerHistory.computeIfAbsent(p, k -> Collections.synchronizedList(new ArrayList<>())).add(record);
        }
    }

    public List<MatchRecord> getHistoryForPlayer(String playerName) {
        return playerHistory.getOrDefault(playerName, Collections.emptyList());
    }

    public List<MatchRecord> getAllMatches() {
        return Collections.unmodifiableList(allMatches);
    }

    public Map<String, GameWorld> getActiveWorlds() {
        return Collections.unmodifiableMap(worlds);
    }

    public int getActiveWorldCount() { return worlds.size(); }
}
