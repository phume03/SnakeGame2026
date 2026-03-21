package com.snakegame.model;

import java.io.Serializable;
import java.util.List;
import java.util.ArrayList;

public class Obstacle implements Serializable {
    private static final long serialVersionUID = 1L;

    public enum ObstacleType { WALL, BORDER, MOVING_BLOCK }

    private List<Point> cells;
    private ObstacleType type;
    private Direction moveDirection; // only for MOVING_BLOCK
    private int moveInterval;        // ticks between moves
    private int moveCounter;

    public Obstacle(List<Point> cells, ObstacleType type) {
        this.cells = new ArrayList<>(cells);
        this.type = type;
        this.moveDirection = Direction.RIGHT;
        this.moveInterval = 5;
        this.moveCounter = 0;
    }

    public List<Point> getCells() { return cells; }
    public ObstacleType getType() { return type; }
    public Direction getMoveDirection() { return moveDirection; }
    public void setMoveDirection(Direction d) { this.moveDirection = d; }
    public int getMoveInterval() { return moveInterval; }
    public void setMoveInterval(int i) { this.moveInterval = i; }

    /**
     * Tick the moving block obstacle. Returns true if it moved.
     */
    public boolean tick(int gridW, int gridH) {
        if (type != ObstacleType.MOVING_BLOCK) return false;
        moveCounter++;
        if (moveCounter < moveInterval) return false;
        moveCounter = 0;

        Point delta = moveDirection.delta();
        List<Point> newCells = new ArrayList<>();
        boolean canMove = true;
        for (Point p : cells) {
            int nx = p.getX() + delta.getX();
            int ny = p.getY() + delta.getY();
            if (nx < 1 || nx >= gridW - 1 || ny < 1 || ny >= gridH - 1) {
                canMove = false;
                break;
            }
            newCells.add(new Point(nx, ny));
        }

        if (!canMove) {
            // Bounce
            moveDirection = moveDirection.opposite();
        } else {
            cells = newCells;
        }
        return true;
    }
}
