package com.snakegame.game;

import com.snakegame.model.*;
import com.snakegame.model.Snake.SnakeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Core game world. Manages up to 3 players (in multiplayer) or 1 player + AI (in single player).
 * The game loop runs at ~10 ticks/second.
 */
public class GameWorld {

    private static final Logger log = LoggerFactory.getLogger(GameWorld.class);

    public static final int GRID_W = 40;
    public static final int GRID_H = 30;
    public static final int MAX_PLAYERS = 3;
    public static final int MAX_APPLES = 5;
    public static final int TOTAL_LEVELS = 10;
    public static final int TICK_RATE_MS = 100; // 10 ticks/sec

    public enum GameMode { SINGLE_PLAYER, MULTIPLAYER }
    public enum GameStatus { WAITING, RUNNING, PAUSED, LEVEL_COMPLETE, GAME_OVER }

    private final String worldId;
    private final GameMode mode;
    private GameStatus status;

    private final Map<String, Snake> snakes = new LinkedHashMap<>();
    private final List<Apple> apples = new ArrayList<>();
    private final List<Obstacle> obstacles = new ArrayList<>();
    private final Set<Point> staticObstacleCells = new HashSet<>();

    private int currentLevel = 1;
    private long levelStartTime;
    private int tickCount = 0;

    private final Random rng = new Random(42); // deterministic seed per world

    private ScheduledExecutorService scheduler;
    private final AtomicBoolean running = new AtomicBoolean(false);

    // Callbacks (implemented by WebSocket endpoint)
    private final List<GameEventListener> listeners = new CopyOnWriteArrayList<>();

    private final AISnakeController aiController = new AISnakeController(GRID_W, GRID_H);

    // Track match history: who played with whom
    private final List<String> allPlayerNames = new ArrayList<>();

    public interface GameEventListener {
        void onStateUpdate(GameWorld world);
        void onGameOver(GameWorld world, String winnerName);
        void onLevelComplete(GameWorld world, int newLevel);
    }

    public GameWorld(String worldId, GameMode mode) {
        this.worldId = worldId;
        this.mode = mode;
        this.status = GameStatus.WAITING;
    }

    // --- Player Management ---

    public synchronized boolean addPlayer(String sessionId, String playerName) {
        if (snakes.size() >= (mode == GameMode.SINGLE_PLAYER ? 1 : MAX_PLAYERS)) return false;
        if (status != GameStatus.WAITING) return false;

        String[] colors = {"#00FF88", "#FF6B35", "#4ECDC4"};
        int idx = snakes.size();
        Point startPos = getStartPosition(idx);
        Direction startDir = Direction.RIGHT;

        Snake snake = new Snake(sessionId, playerName, SnakeType.PLAYER, startPos, startDir, colors[idx]);
        snakes.put(sessionId, snake);
        allPlayerNames.add(playerName);
        return true;
    }

    public synchronized void removePlayer(String sessionId) {
        Snake s = snakes.get(sessionId);
        if (s != null) {
            s.setAlive(false);
            snakes.remove(sessionId);
        }
    }

    public synchronized boolean isFull() {
        int max = mode == GameMode.SINGLE_PLAYER ? 1 : MAX_PLAYERS;
        return snakes.size() >= max;
    }

    public int getPlayerCount() { return snakes.size(); }

    // --- Game Start ---

    public synchronized void startGame() {
        if (status != GameStatus.WAITING) return;
        loadLevel(currentLevel);

        if (mode == GameMode.SINGLE_PLAYER) {
            // Add AI snake
            Point aiStart = getStartPosition(snakes.size());
            Snake aiSnake = new Snake("AI", "System", SnakeType.AI, aiStart, Direction.LEFT, "#FF4444");
            snakes.put("AI", aiSnake);
        }

        spawnApples();
        status = GameStatus.RUNNING;
        levelStartTime = System.currentTimeMillis();

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "game-loop-" + worldId);
            t.setDaemon(true);
            return t;
        });
        scheduler.scheduleAtFixedRate(this::tick, 0, TICK_RATE_MS, TimeUnit.MILLISECONDS);
        running.set(true);
        log.info("Game world {} started in {} mode, level {}", worldId, mode, currentLevel);
    }

    // --- Game Loop ---

    private void tick() {
        try {
            synchronized (this) {
                if (status != GameStatus.RUNNING) return;
                tickCount++;

                // Move AI snake
                moveAI();

                // Move all living snakes
                for (Snake snake : snakes.values()) {
                    if (!snake.isAlive()) continue;
                    if (snake.getType() == SnakeType.AI) continue; // already handled

                    Point newHead = snake.move(false);
                    resolveMove(snake, newHead, false);
                }

                // Tick moving obstacles
                for (Obstacle obs : obstacles) {
                    obs.tick(GRID_W, GRID_H);
                }
                rebuildStaticObstacleCells();

                // Check collisions after move
                checkSnakeCollisions();

                // Level up check
                checkLevelUp();

                // Ensure enough apples
                while (apples.size() < Math.min(currentLevel + 1, MAX_APPLES)) {
                    spawnOneApple();
                }

                // Notify listeners
                for (GameEventListener l : listeners) {
                    try { l.onStateUpdate(this); } catch (Exception ignored) {}
                }

                // Check game over
                checkGameOver();
            }
        } catch (Exception e) {
            log.error("Error in game loop for world {}", worldId, e);
        }
    }

    private void moveAI() {
        Snake ai = snakes.get("AI");
        if (ai == null || !ai.isAlive()) return;

        Set<Point> forbidden = buildForbiddenSet(ai);
        List<Point> applePts = new ArrayList<>();
        for (Apple a : apples) applePts.add(a.getPosition());

        Direction best = aiController.computeDirection(ai, applePts, forbidden);
        ai.setPendingDirection(best);

        Point newHead = ai.move(false);
        resolveMove(ai, newHead, false);
    }

    private void resolveMove(Snake snake, Point newHead, boolean warped) {
        // Wall / border collision
        if (newHead.getX() < 0 || newHead.getX() >= GRID_W ||
            newHead.getY() < 0 || newHead.getY() >= GRID_H) {
            snake.setAlive(false);
            return;
        }

        // Static obstacle collision
        if (staticObstacleCells.contains(newHead)) {
            snake.setAlive(false);
            return;
        }

        // Apple consumption
        Iterator<Apple> it = apples.iterator();
        while (it.hasNext()) {
            Apple apple = it.next();
            if (apple.getPosition().equals(newHead)) {
                it.remove();
                snake.addScore(apple.getPointValue() * currentLevel);
                // Grow by duplicating tail
                Point tail = snake.getBody().peekLast();
                if (tail != null) snake.getBody().addLast(new Point(tail.getX(), tail.getY()));
                spawnOneApple();
                break;
            }
        }
    }

    private void checkSnakeCollisions() {
        // Build all occupied cells by all snakes
        Map<Point, String> occupiedBy = new HashMap<>();
        for (Map.Entry<String, Snake> entry : snakes.entrySet()) {
            if (!entry.getValue().isAlive()) continue;
            List<Point> body = entry.getValue().getBodyList();
            for (int i = 0; i < body.size(); i++) {
                Point p = body.get(i);
                if (i == 0) continue; // skip head for now
                occupiedBy.put(p, entry.getKey());
            }
        }

        // Check each snake's head against occupied cells
        for (Snake snake : snakes.values()) {
            if (!snake.isAlive()) continue;
            Point head = snake.getHead();
            if (occupiedBy.containsKey(head)) {
                snake.setAlive(false); // hit another snake's body (or own body)
            }
        }

        // Check head-to-head collisions
        List<Map.Entry<String, Snake>> livingSnakes = new ArrayList<>();
        for (Map.Entry<String, Snake> e : snakes.entrySet()) {
            if (e.getValue().isAlive()) livingSnakes.add(e);
        }
        for (int i = 0; i < livingSnakes.size(); i++) {
            for (int j = i + 1; j < livingSnakes.size(); j++) {
                Snake a = livingSnakes.get(i).getValue();
                Snake b = livingSnakes.get(j).getValue();
                if (a.getHead().equals(b.getHead())) {
                    a.setAlive(false);
                    b.setAlive(false);
                }
            }
        }
    }

    private void checkLevelUp() {
        // Level up condition: all living human players reach a score threshold
        int threshold = currentLevel * 50;
        boolean allReached = true;
        boolean anyAlive = false;

        for (Snake s : snakes.values()) {
            if (s.getType() == SnakeType.AI) continue;
            if (s.isAlive()) {
                anyAlive = true;
                if (s.getScore() < threshold) allReached = false;
            }
        }

        if (anyAlive && allReached && currentLevel < TOTAL_LEVELS) {
            currentLevel++;
            for (Snake s : snakes.values()) s.setLevel(currentLevel);
            loadLevel(currentLevel);
            spawnApples();
            status = GameStatus.LEVEL_COMPLETE;

            final int newLvl = currentLevel;
            for (GameEventListener l : listeners) {
                try { l.onLevelComplete(this, newLvl); } catch (Exception ignored) {}
            }

            // Resume after short delay
            scheduler.schedule(() -> {
                synchronized (this) { status = GameStatus.RUNNING; }
            }, 2, TimeUnit.SECONDS);
        }
    }

    private void checkGameOver() {
        long aliveHumans = snakes.values().stream()
            .filter(s -> s.getType() == SnakeType.PLAYER && s.isAlive())
            .count();

        boolean gameOver = false;
        String winnerName = null;

        if (aliveHumans == 0) {
            gameOver = true;
        } else if (currentLevel == TOTAL_LEVELS) {
            // Check if all levels complete
            int threshold = TOTAL_LEVELS * 50;
            boolean allDone = snakes.values().stream()
                .filter(s -> s.getType() == SnakeType.PLAYER && s.isAlive())
                .allMatch(s -> s.getScore() >= threshold);
            if (allDone) {
                gameOver = true;
                winnerName = snakes.values().stream()
                    .filter(s -> s.getType() == SnakeType.PLAYER && s.isAlive())
                    .max(Comparator.comparingInt(Snake::getScore))
                    .map(Snake::getPlayerName).orElse("Nobody");
            }
        }

        if (aliveHumans == 1 && mode == GameMode.MULTIPLAYER) {
            // Last snake standing wins
            winnerName = snakes.values().stream()
                .filter(s -> s.getType() == SnakeType.PLAYER && s.isAlive())
                .findFirst().map(Snake::getPlayerName).orElse("Nobody");
            gameOver = true;
        }

        if (gameOver) {
            status = GameStatus.GAME_OVER;
            stopScheduler();
            final String winner = winnerName;
            for (GameEventListener l : listeners) {
                try { l.onGameOver(this, winner); } catch (Exception ignored) {}
            }
        }
    }

    // --- Input Handling ---

    public synchronized void handleInput(String sessionId, String directionStr) {
        Snake snake = snakes.get(sessionId);
        if (snake == null || !snake.isAlive() || status != GameStatus.RUNNING) return;

        Direction dir;
        try { dir = Direction.valueOf(directionStr.toUpperCase()); }
        catch (Exception e) { return; }

        int warp = snake.handleDirectionInput(dir);
        if (warp > 0) {
            Point newHead = snake.warp(warp);
            resolveMove(snake, newHead, true);
        }
    }

    // --- Level Loading ---

    private void loadLevel(int level) {
        obstacles.clear();
        staticObstacleCells.clear();
        obstacles.addAll(LevelDesigner.getObstacles(level, mode == GameMode.SINGLE_PLAYER));
        rebuildStaticObstacleCells();
        log.info("World {} loaded level {} with {} obstacles", worldId, level, obstacles.size());
    }

    private void rebuildStaticObstacleCells() {
        staticObstacleCells.clear();
        for (Obstacle obs : obstacles) {
            staticObstacleCells.addAll(obs.getCells());
        }
    }

    // --- Apple Spawning ---

    private void spawnApples() {
        apples.clear();
        int count = Math.min(currentLevel + 1, MAX_APPLES);
        for (int i = 0; i < count; i++) spawnOneApple();
    }

    private synchronized void spawnOneApple() {
        if (apples.size() >= MAX_APPLES) return;
        Set<Point> forbidden = new HashSet<>(staticObstacleCells);
        for (Apple a : apples) forbidden.add(a.getPosition());
        for (Snake s : snakes.values()) {
            if (s.isAlive()) {
                forbidden.addAll(s.getBodyList());
                // Don't spawn in front of snake
                Point head = s.getHead();
                Point delta = s.getDirection().delta();
                forbidden.add(new Point(head.getX() + delta.getX(), head.getY() + delta.getY()));
                forbidden.add(new Point(head.getX() + 2*delta.getX(), head.getY() + 2*delta.getY()));
            }
        }

        for (int attempt = 0; attempt < 200; attempt++) {
            int x = 1 + rng.nextInt(GRID_W - 2);
            int y = 1 + rng.nextInt(GRID_H - 2);
            Point p = new Point(x, y);
            if (!forbidden.contains(p)) {
                apples.add(new Apple(p, apples.size()));
                return;
            }
        }
    }

    // --- Utility ---

    private Point getStartPosition(int idx) {
        switch (idx) {
            case 0: return new Point(5, GRID_H / 2);
            case 1: return new Point(GRID_W - 5, GRID_H / 2);
            case 2: return new Point(GRID_W / 2, GRID_H / 2);
            default: return new Point(GRID_W / 2, GRID_H / 2);
        }
    }

    private Set<Point> buildForbiddenSet(Snake self) {
        Set<Point> forbidden = new HashSet<>(staticObstacleCells);
        for (Snake other : snakes.values()) {
            if (other == self) continue;
            if (other.isAlive()) forbidden.addAll(other.getBodyList());
        }
        // Add own body (except tail which will move)
        List<Point> selfBody = self.getBodyList();
        for (int i = 0; i < selfBody.size() - 1; i++) forbidden.add(selfBody.get(i));
        return forbidden;
    }

    private void stopScheduler() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        running.set(false);
    }

    public void stop() {
        synchronized (this) {
            status = GameStatus.GAME_OVER;
            stopScheduler();
        }
    }

    // --- Listeners ---

    public void addListener(GameEventListener listener) { listeners.add(listener); }
    public void removeListener(GameEventListener listener) { listeners.remove(listener); }

    // --- Getters ---

    public String getWorldId() { return worldId; }
    public GameMode getMode() { return mode; }
    public GameStatus getStatus() { return status; }
    public Map<String, Snake> getSnakes() { return Collections.unmodifiableMap(snakes); }
    public List<Apple> getApples() { return Collections.unmodifiableList(apples); }
    public List<Obstacle> getObstacles() { return Collections.unmodifiableList(obstacles); }
    public int getCurrentLevel() { return currentLevel; }
    public int getGridW() { return GRID_W; }
    public int getGridH() { return GRID_H; }
    public List<String> getAllPlayerNames() { return Collections.unmodifiableList(allPlayerNames); }
}
