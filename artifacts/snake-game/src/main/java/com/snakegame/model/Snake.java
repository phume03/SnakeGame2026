package com.snakegame.model;

import java.io.Serializable;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;

public class Snake implements Serializable {
    private static final long serialVersionUID = 1L;

    public enum SnakeType { PLAYER, AI }

    private String id;
    private String playerName;
    private SnakeType type;
    private Deque<Point> body;
    private Direction direction;
    private Direction pendingDirection;
    private String color;
    private boolean alive;
    private int score;
    private int level;

    // For warp mechanic: track last key tap time
    private Direction lastTappedDirection;
    private long lastTapTime;
    private static final long DOUBLE_TAP_THRESHOLD_MS = 400;

    public Snake(String id, String playerName, SnakeType type, Point start, Direction dir, String color) {
        this.id = id;
        this.playerName = playerName;
        this.type = type;
        this.body = new ArrayDeque<>();
        this.body.addFirst(start);
        // Start with length 3
        Point d = dir.delta();
        Point second = new Point(start.getX() - d.getX(), start.getY() - d.getY());
        Point third  = new Point(start.getX() - 2 * d.getX(), start.getY() - 2 * d.getY());
        this.body.addLast(second);
        this.body.addLast(third);
        this.direction = dir;
        this.pendingDirection = dir;
        this.color = color;
        this.alive = true;
        this.score = 0;
        this.level = 1;
    }

    public Point getHead() {
        return body.peekFirst();
    }

    /**
     * Move the snake one step in the pending direction.
     * Returns the new head position.
     */
    public Point move(boolean grow) {
        this.direction = pendingDirection;
        Point delta = direction.delta();
        Point head = getHead();
        Point newHead = new Point(head.getX() + delta.getX(), head.getY() + delta.getY());
        body.addFirst(newHead);
        if (!grow) {
            body.removeLast();
        }
        return newHead;
    }

    /**
     * Warp the snake 1-2 spaces forward.
     * @param spaces number of spaces to warp (1 or 2)
     * @return new head position
     */
    public Point warp(int spaces) {
        this.direction = pendingDirection;
        Point delta = direction.delta();
        Point head = getHead();
        // Remove the tail segments equal to spaces to avoid collision
        for (int i = 0; i < spaces && body.size() > 1; i++) {
            body.removeLast();
        }
        Point newHead = new Point(
            head.getX() + delta.getX() * spaces,
            head.getY() + delta.getY() * spaces
        );
        body.addFirst(newHead);
        return newHead;
    }

    /**
     * Handle a direction key press. Returns warp amount (0 = no warp, 1 or 2 = warp).
     */
    public int handleDirectionInput(Direction newDir) {
        // Prevent reversing
        if (newDir == direction.opposite()) return 0;

        long now = System.currentTimeMillis();
        if (newDir == lastTappedDirection && (now - lastTapTime) < DOUBLE_TAP_THRESHOLD_MS) {
            // Double tap detected — warp
            lastTapTime = 0;
            lastTappedDirection = null;
            pendingDirection = newDir;
            return (newDir == direction) ? 2 : 1;
        } else {
            lastTappedDirection = newDir;
            lastTapTime = now;
            pendingDirection = newDir;
            return 0;
        }
    }

    public Set<Point> getBodySet() {
        return new HashSet<>(body);
    }

    public List<Point> getBodyList() {
        return new ArrayList<>(body);
    }

    public int getLength() { return body.size(); }

    // Getters / Setters
    public String getId() { return id; }
    public String getPlayerName() { return playerName; }
    public SnakeType getType() { return type; }
    public Deque<Point> getBody() { return body; }
    public Direction getDirection() { return direction; }
    public void setPendingDirection(Direction d) {
        if (d != direction.opposite()) this.pendingDirection = d;
    }
    public Direction getPendingDirection() { return pendingDirection; }
    public String getColor() { return color; }
    public boolean isAlive() { return alive; }
    public void setAlive(boolean alive) { this.alive = alive; }
    public int getScore() { return score; }
    public void addScore(int pts) { this.score += pts; }
    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }
}
