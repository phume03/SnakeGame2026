import {
  DOUBLE_TAP_THRESHOLD_MS,
  INITIAL_SNAKE_LENGTH,
} from "./constants.js";
import type { Direction, Point, SnakeType } from "./types.js";

const DELTAS: Record<Direction, Point> = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

const OPPOSITES: Record<Direction, Direction> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

export class Snake {
  id: string;
  name: string;
  type: SnakeType;
  color: string;
  body: Point[];          // body[0] = head
  direction: Direction;
  pendingDirection: Direction;
  alive: boolean;
  score: number;
  level: number;

  private lastTappedDir: Direction | null = null;
  private lastTapTime = 0;

  constructor(
    id: string,
    name: string,
    type: SnakeType,
    start: Point,
    dir: Direction,
    color: string,
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.color = color;
    this.direction = dir;
    this.pendingDirection = dir;
    this.alive = true;
    this.score = 0;
    this.level = 1;

    // Build initial body
    const d = DELTAS[dir];
    this.body = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      this.body.push({ x: start.x - d.x * i, y: start.y - d.y * i });
    }
  }

  get head(): Point {
    return this.body[0];
  }

  get bodySet(): Set<string> {
    const s = new Set<string>();
    for (const p of this.body) s.add(`${p.x},${p.y}`);
    return s;
  }

  /** Move snake one step. grow=true to skip removing tail. Returns new head. */
  move(grow: boolean): Point {
    this.direction = this.pendingDirection;
    const d = DELTAS[this.direction];
    const newHead = { x: this.head.x + d.x, y: this.head.y + d.y };
    this.body.unshift(newHead);
    if (!grow) this.body.pop();
    return newHead;
  }

  /** Warp 1 or 2 spaces forward. Returns new head. */
  warp(spaces: 1 | 2): Point {
    this.direction = this.pendingDirection;
    const d = DELTAS[this.direction];
    // Remove tail segments to avoid length overflow
    for (let i = 0; i < spaces && this.body.length > 1; i++) {
      this.body.pop();
    }
    const newHead = {
      x: this.head.x + d.x * spaces,
      y: this.head.y + d.y * spaces,
    };
    this.body.unshift(newHead);
    return newHead;
  }

  /**
   * Handle a direction input. Returns warp amount (0 = no warp, 1|2 = warp).
   */
  handleInput(dir: Direction): 0 | 1 | 2 {
    if (dir === OPPOSITES[this.direction]) return 0;

    const now = Date.now();
    if (
      dir === this.lastTappedDir &&
      now - this.lastTapTime < DOUBLE_TAP_THRESHOLD_MS
    ) {
      this.lastTapTime = 0;
      this.lastTappedDir = null;
      this.pendingDirection = dir;
      return dir === this.direction ? 2 : 1;
    }
    this.lastTappedDir = dir;
    this.lastTapTime = now;
    this.pendingDirection = dir;
    return 0;
  }

  setPending(dir: Direction): void {
    if (dir !== OPPOSITES[this.direction]) this.pendingDirection = dir;
  }

  addScore(pts: number): void {
    this.score += pts;
  }
}
