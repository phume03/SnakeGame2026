package com.snakegame.model;

import java.io.Serializable;

public class Apple implements Serializable {
    private static final long serialVersionUID = 1L;

    private static final String[] COLORS = {"red", "green", "gold", "orange", "crimson"};
    private static int colorIndex = 0;

    private Point position;
    private String color;
    private int pointValue;

    public Apple(Point position, int colorIdx) {
        this.position = position;
        this.color = COLORS[colorIdx % COLORS.length];
        this.pointValue = (colorIdx % COLORS.length) + 1;
    }

    public Point getPosition() { return position; }
    public void setPosition(Point position) { this.position = position; }
    public String getColor() { return color; }
    public int getPointValue() { return pointValue; }
}
