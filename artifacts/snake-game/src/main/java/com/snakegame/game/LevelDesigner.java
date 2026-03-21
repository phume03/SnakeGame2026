package com.snakegame.game;

import com.snakegame.model.Direction;
import com.snakegame.model.Obstacle;
import com.snakegame.model.Obstacle.ObstacleType;
import com.snakegame.model.Point;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic level designer — given a level number (1-10) produces
 * a consistent set of obstacles regardless of how many times the game is played.
 * Levels use fixed seeds so layout is always identical.
 */
public class LevelDesigner {

    private static final int W = 40; // grid width
    private static final int H = 30; // grid height

    /**
     * Returns the list of obstacles for the given level (1–10).
     * isSinglePlayer controls whether single-player or multiplayer obstacle variant is used.
     */
    public static List<Obstacle> getObstacles(int level, boolean isSinglePlayer) {
        List<Obstacle> obstacles = new ArrayList<>();

        switch (level) {
            case 1:
                // No obstacles — open field
                break;

            case 2:
                // Horizontal divider in the middle
                obstacles.add(wall(10, H/2, 20, H/2));
                break;

            case 3:
                // Cross obstacle in center
                obstacles.add(wall(W/2, 5, W/2, H-5));
                obstacles.add(wall(5, H/2, W-5, H/2));
                break;

            case 4:
                // Four corner blocks
                obstacles.add(block(3, 3, 6, 6));
                obstacles.add(block(W-7, 3, W-3, 6));
                obstacles.add(block(3, H-7, 6, H-3));
                obstacles.add(block(W-7, H-7, W-3, H-3));
                break;

            case 5:
                // Checkerboard-style walls (gaps for navigation)
                for (int c = 5; c < W-5; c += 7) {
                    if ((c / 7) % 2 == 0) {
                        obstacles.add(wall(c, 3, c, H/2 - 2));
                    } else {
                        obstacles.add(wall(c, H/2 + 2, c, H - 3));
                    }
                }
                break;

            case 6:
                // Spiral-ish walls
                obstacles.add(wall(5, 5, 15, 5));
                obstacles.add(wall(5, 5, 5, 15));
                obstacles.add(wall(W-15, H-5, W-5, H-5));
                obstacles.add(wall(W-5, H-15, W-5, H-5));
                obstacles.add(wall(10, 10, 20, 10));
                obstacles.add(wall(10, 10, 10, H-10));
                break;

            case 7:
                // Moving blocks
                List<Point> mb1 = row(5, H/3, 8);
                Obstacle moving1 = new Obstacle(mb1, ObstacleType.MOVING_BLOCK);
                moving1.setMoveDirection(Direction.RIGHT);
                moving1.setMoveInterval(3);
                obstacles.add(moving1);

                List<Point> mb2 = col(W/2, 5, 8);
                Obstacle moving2 = new Obstacle(mb2, ObstacleType.MOVING_BLOCK);
                moving2.setMoveDirection(Direction.DOWN);
                moving2.setMoveInterval(4);
                obstacles.add(moving2);

                obstacles.add(wall(8, 8, 18, 8));
                obstacles.add(wall(W-18, H-8, W-8, H-8));
                break;

            case 8:
                // Maze-like structure
                obstacles.add(wall(5, 5, 5, H-5));
                obstacles.add(wall(W-5, 5, W-5, H-5));
                obstacles.add(wall(5, 5, W/2-3, 5));
                obstacles.add(wall(W/2+3, 5, W-5, 5));
                obstacles.add(wall(5, H-5, W/2-3, H-5));
                obstacles.add(wall(W/2+3, H-5, W-5, H-5));
                obstacles.add(wall(12, 12, 12, H-12));
                obstacles.add(wall(W-12, 12, W-12, H-12));
                obstacles.add(wall(12, H/2, W-12, H/2));
                break;

            case 9:
                // Dense moving blocks + walls
                obstacles.add(wall(5, 10, 20, 10));
                obstacles.add(wall(W-20, H-10, W-5, H-10));
                obstacles.add(wall(W/2, 3, W/2, H/2-3));
                obstacles.add(wall(W/2, H/2+3, W/2, H-3));

                List<Point> mb3 = row(3, H/4, 6);
                Obstacle m3 = new Obstacle(mb3, ObstacleType.MOVING_BLOCK);
                m3.setMoveDirection(Direction.RIGHT);
                m3.setMoveInterval(2);
                obstacles.add(m3);

                List<Point> mb4 = col(3*W/4, 3, 6);
                Obstacle m4 = new Obstacle(mb4, ObstacleType.MOVING_BLOCK);
                m4.setMoveDirection(Direction.DOWN);
                m4.setMoveInterval(2);
                obstacles.add(m4);
                break;

            case 10:
                // Maximum challenge: rings + multiple movers
                obstacles.add(wall(4, 4, W-4, 4));
                obstacles.add(wall(4, H-4, W-4, H-4));
                obstacles.add(wall(4, 4, 4, H-4));
                obstacles.add(wall(W-4, 4, W-4, H-4));

                obstacles.add(wall(10, 10, W-10, 10));
                obstacles.add(wall(10, H-10, W-10, H-10));
                obstacles.add(wall(10, 10, 10, H-10));
                obstacles.add(wall(W-10, 10, W-10, H-10));

                for (int i = 0; i < 3; i++) {
                    List<Point> mbFinal = row(5 + i * 10, H/2, 4);
                    Obstacle mf = new Obstacle(mbFinal, ObstacleType.MOVING_BLOCK);
                    mf.setMoveDirection(i % 2 == 0 ? Direction.RIGHT : Direction.LEFT);
                    mf.setMoveInterval(2);
                    obstacles.add(mf);
                }
                break;
        }

        return obstacles;
    }

    // --- Helpers ---

    private static Obstacle wall(int x1, int y1, int x2, int y2) {
        List<Point> pts = new ArrayList<>();
        if (x1 == x2) {
            int minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
            for (int y = minY; y <= maxY; y++) pts.add(new Point(x1, y));
        } else {
            int minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
            for (int x = minX; x <= maxX; x++) pts.add(new Point(x, y1));
        }
        return new Obstacle(pts, ObstacleType.WALL);
    }

    private static Obstacle block(int x1, int y1, int x2, int y2) {
        List<Point> pts = new ArrayList<>();
        for (int y = y1; y <= y2; y++)
            for (int x = x1; x <= x2; x++)
                pts.add(new Point(x, y));
        return new Obstacle(pts, ObstacleType.WALL);
    }

    private static List<Point> row(int startX, int y, int length) {
        List<Point> pts = new ArrayList<>();
        for (int i = 0; i < length; i++) pts.add(new Point(startX + i, y));
        return pts;
    }

    private static List<Point> col(int x, int startY, int length) {
        List<Point> pts = new ArrayList<>();
        for (int i = 0; i < length; i++) pts.add(new Point(x, startY + i));
        return pts;
    }
}
