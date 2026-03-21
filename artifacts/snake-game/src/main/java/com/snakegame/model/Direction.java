package com.snakegame.model;

public enum Direction {
    UP, DOWN, LEFT, RIGHT;

    public Direction opposite() {
        switch (this) {
            case UP:    return DOWN;
            case DOWN:  return UP;
            case LEFT:  return RIGHT;
            case RIGHT: return LEFT;
            default:    return this;
        }
    }

    public Point delta() {
        switch (this) {
            case UP:    return new Point(0, -1);
            case DOWN:  return new Point(0,  1);
            case LEFT:  return new Point(-1, 0);
            case RIGHT: return new Point(1,  0);
            default:    return new Point(0,  0);
        }
    }
}
