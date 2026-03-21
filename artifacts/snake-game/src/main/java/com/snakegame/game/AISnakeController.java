package com.snakegame.game;

import com.snakegame.model.Direction;
import com.snakegame.model.Point;
import com.snakegame.model.Snake;

import java.util.*;

/**
 * Simple AI controller for the system snake.
 * Uses BFS to navigate towards the nearest apple, avoiding walls and other snakes.
 */
public class AISnakeController {

    private final int gridW;
    private final int gridH;

    public AISnakeController(int gridW, int gridH) {
        this.gridW = gridW;
        this.gridH = gridH;
    }

    /**
     * Compute the best direction for the AI snake to move.
     *
     * @param snake       the AI snake
     * @param apples      list of apple positions (targets)
     * @param forbidden   set of all cells the snake cannot enter (walls + other snake bodies)
     * @return next direction
     */
    public Direction computeDirection(Snake snake, List<Point> apples, Set<Point> forbidden) {
        if (apples.isEmpty()) {
            return safeRandom(snake, forbidden);
        }

        Point head = snake.getHead();
        Direction current = snake.getDirection();

        // Find nearest apple by BFS
        Point target = nearestApple(head, apples, forbidden, snake.getBodySet());
        if (target == null) {
            return safeRandom(snake, forbidden);
        }

        // BFS to find shortest path to target
        Direction best = bfsDirection(head, target, forbidden, snake.getBodySet(), current);
        return best != null ? best : safeRandom(snake, forbidden);
    }

    private Point nearestApple(Point head, List<Point> apples, Set<Point> forbidden, Set<Point> ownBody) {
        Point best = null;
        int bestDist = Integer.MAX_VALUE;
        for (Point apple : apples) {
            int d = Math.abs(apple.getX() - head.getX()) + Math.abs(apple.getY() - head.getY());
            if (d < bestDist) {
                bestDist = d;
                best = apple;
            }
        }
        return best;
    }

    private Direction bfsDirection(Point start, Point goal, Set<Point> forbidden, Set<Point> ownBody, Direction current) {
        Queue<Point> queue = new LinkedList<>();
        Map<Point, Direction> firstDir = new HashMap<>();
        Set<Point> visited = new HashSet<>();

        for (Direction d : Direction.values()) {
            if (d == current.opposite()) continue;
            Point next = step(start, d);
            if (!isValid(next, forbidden)) continue;
            if (next.equals(goal)) return d;
            if (!visited.contains(next)) {
                visited.add(next);
                firstDir.put(next, d);
                queue.add(next);
            }
        }

        int iterations = 0;
        while (!queue.isEmpty() && iterations < 2000) {
            iterations++;
            Point cur = queue.poll();
            for (Direction d : Direction.values()) {
                Point next = step(cur, d);
                if (next.equals(goal)) return firstDir.get(cur);
                if (isValid(next, forbidden) && !visited.contains(next)) {
                    visited.add(next);
                    firstDir.put(next, firstDir.get(cur));
                    queue.add(next);
                }
            }
        }
        return null;
    }

    private boolean isValid(Point p, Set<Point> forbidden) {
        if (p.getX() < 0 || p.getX() >= gridW || p.getY() < 0 || p.getY() >= gridH) return false;
        return !forbidden.contains(p);
    }

    private Point step(Point p, Direction d) {
        Point delta = d.delta();
        return new Point(p.getX() + delta.getX(), p.getY() + delta.getY());
    }

    private Direction safeRandom(Snake snake, Set<Point> forbidden) {
        Point head = snake.getHead();
        Direction current = snake.getDirection();
        List<Direction> options = new ArrayList<>();

        for (Direction d : Direction.values()) {
            if (d == current.opposite()) continue;
            Point next = step(head, d);
            if (isValid(next, forbidden)) options.add(d);
        }

        if (options.isEmpty()) return current;
        // Prefer continuing straight
        if (options.contains(current)) return current;
        Collections.shuffle(options);
        return options.get(0);
    }
}
