// ============================================================
// LEVEL DEFINITIONS — edited here, synced to Java by sync-to-java.mjs
// ============================================================
// Each level is a list of obstacle specs.
// type: "WALL" | "MOVING_BLOCK"
// For WALL: cells is the full list of points
// For MOVING_BLOCK: cells + dir ("RIGHT"|"LEFT"|"UP"|"DOWN") + interval (ticks)
// ============================================================

import { GRID_W, GRID_H } from "./constants.js";
import type { Point } from "./types.js";

export interface ObstacleDef {
  type: "WALL" | "MOVING_BLOCK";
  cells: Point[];
  dir?: "UP" | "DOWN" | "LEFT" | "RIGHT";
  interval?: number;
}

export type LevelDef = ObstacleDef[];

function hwall(x1: number, x2: number, y: number): Point[] {
  const pts: Point[] = [];
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) pts.push({ x, y });
  return pts;
}

function vwall(x: number, y1: number, y2: number): Point[] {
  const pts: Point[] = [];
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) pts.push({ x, y });
  return pts;
}

function block(x1: number, y1: number, x2: number, y2: number): Point[] {
  const pts: Point[] = [];
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      pts.push({ x, y });
  return pts;
}

function row(startX: number, y: number, length: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < length; i++) pts.push({ x: startX + i, y });
  return pts;
}

function col(x: number, startY: number, length: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < length; i++) pts.push({ x, y: startY + i });
  return pts;
}

const W = GRID_W;
const H = GRID_H;

// LEVELS array — index 0 = level 1, index 9 = level 10
export const LEVELS: LevelDef[] = [
  // Level 1 — open field
  [],

  // Level 2 — horizontal divider
  [{ type: "WALL", cells: hwall(10, 30, Math.floor(H / 2)) }],

  // Level 3 — cross
  [
    { type: "WALL", cells: vwall(Math.floor(W / 2), 5, H - 5) },
    { type: "WALL", cells: hwall(5, W - 5, Math.floor(H / 2)) },
  ],

  // Level 4 — corner blocks
  [
    { type: "WALL", cells: block(3, 3, 6, 6) },
    { type: "WALL", cells: block(W - 7, 3, W - 3, 6) },
    { type: "WALL", cells: block(3, H - 7, 6, H - 3) },
    { type: "WALL", cells: block(W - 7, H - 7, W - 3, H - 3) },
  ],

  // Level 5 — alternating vertical walls
  ...[
    ((): LevelDef => {
      const obs: LevelDef = [];
      for (let c = 5; c < W - 5; c += 7) {
        if (Math.floor(c / 7) % 2 === 0) {
          obs.push({ type: "WALL", cells: vwall(c, 3, Math.floor(H / 2) - 2) });
        } else {
          obs.push({ type: "WALL", cells: vwall(c, Math.floor(H / 2) + 2, H - 3) });
        }
      }
      return obs;
    })(),
  ],

  // Level 6 — spiral-style walls
  [
    { type: "WALL", cells: hwall(5, 15, 5) },
    { type: "WALL", cells: vwall(5, 5, 15) },
    { type: "WALL", cells: hwall(W - 15, W - 5, H - 5) },
    { type: "WALL", cells: vwall(W - 5, H - 15, H - 5) },
    { type: "WALL", cells: hwall(10, 20, 10) },
    { type: "WALL", cells: vwall(10, 10, H - 10) },
  ],

  // Level 7 — first moving blocks + walls
  [
    { type: "MOVING_BLOCK", cells: row(5, Math.floor(H / 3), 8),  dir: "RIGHT", interval: 3 },
    { type: "MOVING_BLOCK", cells: col(Math.floor(W / 2), 5, 8),   dir: "DOWN",  interval: 4 },
    { type: "WALL", cells: hwall(8, 18, 8) },
    { type: "WALL", cells: hwall(W - 18, W - 8, H - 8) },
  ],

  // Level 8 — maze
  [
    { type: "WALL", cells: vwall(5, 5, H - 5) },
    { type: "WALL", cells: vwall(W - 5, 5, H - 5) },
    { type: "WALL", cells: hwall(5, Math.floor(W / 2) - 3, 5) },
    { type: "WALL", cells: hwall(Math.floor(W / 2) + 3, W - 5, 5) },
    { type: "WALL", cells: hwall(5, Math.floor(W / 2) - 3, H - 5) },
    { type: "WALL", cells: hwall(Math.floor(W / 2) + 3, W - 5, H - 5) },
    { type: "WALL", cells: vwall(12, 12, H - 12) },
    { type: "WALL", cells: vwall(W - 12, 12, H - 12) },
    { type: "WALL", cells: hwall(12, W - 12, Math.floor(H / 2)) },
  ],

  // Level 9 — dense + 2 movers
  [
    { type: "WALL", cells: hwall(5, 20, 10) },
    { type: "WALL", cells: hwall(W - 20, W - 5, H - 10) },
    { type: "WALL", cells: vwall(Math.floor(W / 2), 3, Math.floor(H / 2) - 3) },
    { type: "WALL", cells: vwall(Math.floor(W / 2), Math.floor(H / 2) + 3, H - 3) },
    { type: "MOVING_BLOCK", cells: row(3, Math.floor(H / 4), 6), dir: "RIGHT", interval: 2 },
    { type: "MOVING_BLOCK", cells: col(Math.floor(3 * W / 4), 3, 6), dir: "DOWN", interval: 2 },
  ],

  // Level 10 — max challenge: double ring + 3 fast movers
  [
    { type: "WALL", cells: hwall(4, W - 4, 4) },
    { type: "WALL", cells: hwall(4, W - 4, H - 4) },
    { type: "WALL", cells: vwall(4, 4, H - 4) },
    { type: "WALL", cells: vwall(W - 4, 4, H - 4) },
    { type: "WALL", cells: hwall(10, W - 10, 10) },
    { type: "WALL", cells: hwall(10, W - 10, H - 10) },
    { type: "WALL", cells: vwall(10, 10, H - 10) },
    { type: "WALL", cells: vwall(W - 10, 10, H - 10) },
    { type: "MOVING_BLOCK", cells: row(5, Math.floor(H / 2), 4), dir: "RIGHT", interval: 2 },
    { type: "MOVING_BLOCK", cells: row(15, Math.floor(H / 2), 4), dir: "LEFT",  interval: 2 },
    { type: "MOVING_BLOCK", cells: row(25, Math.floor(H / 2), 4), dir: "RIGHT", interval: 2 },
  ],
];
