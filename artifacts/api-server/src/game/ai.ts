import type { Direction, Point } from "./types.js";
import type { Snake } from "./snake.js";

const DIRS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
const DELTAS: Record<Direction, Point> = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};
const OPP: Record<Direction, Direction> = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
};

export class AIController {
  constructor(private gridW: number, private gridH: number) {}

  compute(snake: Snake, apples: Point[], forbidden: Set<string>): Direction {
    if (apples.length === 0) return this.safeFallback(snake, forbidden);

    const head = snake.head;
    const target = this.nearest(head, apples);
    if (!target) return this.safeFallback(snake, forbidden);

    const best = this.bfs(head, target, forbidden, snake.direction);
    return best ?? this.safeFallback(snake, forbidden);
  }

  private nearest(from: Point, apples: Point[]): Point | null {
    let best: Point | null = null;
    let bestDist = Infinity;
    for (const a of apples) {
      const d = Math.abs(a.x - from.x) + Math.abs(a.y - from.y);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    return best;
  }

  private bfs(
    start: Point,
    goal: Point,
    forbidden: Set<string>,
    current: Direction,
  ): Direction | null {
    const queue: Point[] = [];
    const firstDir = new Map<string, Direction>();
    const visited = new Set<string>();

    const key = (p: Point) => `${p.x},${p.y}`;

    for (const d of DIRS) {
      if (d === OPP[current]) continue;
      const next = this.step(start, d);
      if (next.x === goal.x && next.y === goal.y) return d;
      if (!this.valid(next, forbidden) || visited.has(key(next))) continue;
      visited.add(key(next));
      firstDir.set(key(next), d);
      queue.push(next);
    }

    let i = 0;
    while (i < queue.length && i < 2000) {
      const cur = queue[i++];
      for (const d of DIRS) {
        const next = this.step(cur, d);
        if (next.x === goal.x && next.y === goal.y) return firstDir.get(key(cur))!;
        if (!this.valid(next, forbidden) || visited.has(key(next))) continue;
        visited.add(key(next));
        firstDir.set(key(next), firstDir.get(key(cur))!);
        queue.push(next);
      }
    }
    return null;
  }

  private safeFallback(snake: Snake, forbidden: Set<string>): Direction {
    const options: Direction[] = [];
    for (const d of DIRS) {
      if (d === (OPP[snake.direction])) continue;
      if (this.valid(this.step(snake.head, d), forbidden)) options.push(d);
    }
    if (options.includes(snake.direction)) return snake.direction;
    return options[0] ?? snake.direction;
  }

  private step(p: Point, d: Direction): Point {
    const delta = DELTAS[d];
    return { x: p.x + delta.x, y: p.y + delta.y };
  }

  private valid(p: Point, forbidden: Set<string>): boolean {
    if (p.x < 0 || p.x >= this.gridW || p.y < 0 || p.y >= this.gridH) return false;
    return !forbidden.has(`${p.x},${p.y}`);
  }
}
