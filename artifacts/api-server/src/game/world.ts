import {
  GRID_W, GRID_H, MAX_PLAYERS, MAX_APPLES, TOTAL_LEVELS,
  TICK_RATE_MS, LEVEL_PAUSE_MS, SCORE_PER_APPLE_PER_LEVEL,
  LEVEL_UP_THRESHOLD, SNAKE_COLORS, APPLE_COLORS, AI_COLOR,
} from "./constants.js";
import { LEVELS, type ObstacleDef } from "./levels.js";
import { Snake } from "./snake.js";
import { AIController } from "./ai.js";
import type {
  Direction, GameMode, GameStatus, Point,
  SnakeState, AppleState, ObstacleState,
} from "./types.js";

interface Apple {
  pos: Point;
  color: string;
  points: number;
}

interface ObstacleInst extends ObstacleDef {
  cells: Point[];
  moveCounter: number;
}

export interface GameEventHandlers {
  onState: (world: GameWorld) => void;
  onGameOver: (world: GameWorld, winner: string | null) => void;
  onLevelComplete: (world: GameWorld, newLevel: number) => void;
}

const RNG_SEED = 42;

export class GameWorld {
  readonly worldId: string;
  readonly mode: GameMode;
  status: GameStatus = "WAITING";

  snakes = new Map<string, Snake>();
  apples: Apple[] = [];
  obstacles: ObstacleInst[] = [];
  level = 1;

  private staticCells = new Set<string>();
  private handlers: GameEventHandlers[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private rng: () => number;
  private ai = new AIController(GRID_W, GRID_H);
  private allPlayerNames: string[] = [];

  constructor(worldId: string, mode: GameMode) {
    this.worldId = worldId;
    this.mode = mode;
    // Simple deterministic pseudo-RNG
    let seed = RNG_SEED;
    this.rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0xffffffff;
    };
  }

  // --- Player management ---

  addPlayer(sessionId: string, name: string): boolean {
    const max = this.mode === "SINGLE_PLAYER" ? 1 : MAX_PLAYERS;
    if (this.snakes.size >= max || this.status !== "WAITING") return false;
    const idx = this.snakes.size;
    const start = this.startPos(idx);
    const color = SNAKE_COLORS[idx % SNAKE_COLORS.length];
    const snake = new Snake(sessionId, name, "PLAYER", start, "RIGHT", color);
    this.snakes.set(sessionId, snake);
    this.allPlayerNames.push(name);
    return true;
  }

  removePlayer(sessionId: string): void {
    const s = this.snakes.get(sessionId);
    if (s) { s.alive = false; this.snakes.delete(sessionId); }
  }

  get playerCount(): number {
    return [...this.snakes.values()].filter((s) => s.type === "PLAYER").length;
  }

  get isFull(): boolean {
    return this.playerCount >= (this.mode === "SINGLE_PLAYER" ? 1 : MAX_PLAYERS);
  }

  get allPlayers(): string[] { return [...this.allPlayerNames]; }

  // --- Start ---

  start(): void {
    if (this.status !== "WAITING") return;
    this.loadLevel(this.level);

    if (this.mode === "SINGLE_PLAYER") {
      const ai = new Snake("AI", "System", "AI", this.startPos(this.snakes.size), "LEFT", AI_COLOR);
      this.snakes.set("AI", ai);
    }

    this.spawnApples();
    this.status = "RUNNING";
    this.timer = setInterval(() => this.tick(), TICK_RATE_MS);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.status = "GAME_OVER";
  }

  // --- Input ---

  handleInput(sessionId: string, dir: Direction): void {
    if (this.status !== "RUNNING") return;
    const snake = this.snakes.get(sessionId);
    if (!snake || !snake.alive) return;

    const warp = snake.handleInput(dir);
    if (warp > 0) {
      const newHead = snake.warp(warp as 1 | 2);
      this.resolveMove(snake, newHead);
    }
  }

  // --- Game loop ---

  private tick(): void {
    if (this.status !== "RUNNING") return;

    // AI move
    this.moveAI();

    // Player moves
    for (const snake of this.snakes.values()) {
      if (!snake.alive || snake.type === "AI") continue;
      const newHead = snake.move(false);
      this.resolveMove(snake, newHead);
    }

    // Tick moving obstacles
    let obstaclesMoved = false;
    for (const obs of this.obstacles) {
      if (obs.type !== "MOVING_BLOCK") continue;
      obs.moveCounter = (obs.moveCounter || 0) + 1;
      if (obs.moveCounter < (obs.interval ?? 5)) continue;
      obs.moveCounter = 0;
      const dir = obs.dir ?? "RIGHT";
      const delta: Point = { RIGHT:{x:1,y:0}, LEFT:{x:-1,y:0}, DOWN:{x:0,y:1}, UP:{x:0,y:-1} }[dir];
      const newCells = obs.cells.map((c) => ({ x: c.x + delta.x, y: c.y + delta.y }));
      const canMove = newCells.every(
        (c) => c.x >= 1 && c.x < GRID_W - 1 && c.y >= 1 && c.y < GRID_H - 1,
      );
      if (!canMove) {
        obs.dir = { RIGHT:"LEFT", LEFT:"RIGHT", DOWN:"UP", UP:"DOWN" }[dir] as Direction;
      } else {
        obs.cells = newCells;
        obstaclesMoved = true;
      }
    }
    if (obstaclesMoved) this.rebuildStatic();

    // Check snake-body collisions
    this.checkCollisions();

    // Refill apples
    while (this.apples.length < Math.min(this.level + 1, MAX_APPLES)) {
      this.spawnOneApple();
    }

    // Broadcast state
    this.emit("state");

    // Level / game over check
    this.checkLevelUp();
    this.checkGameOver();
  }

  private moveAI(): void {
    const ai = this.snakes.get("AI");
    if (!ai || !ai.alive) return;
    const forbidden = this.buildForbidden(ai);
    const applePts = this.apples.map((a) => a.pos);
    const best = this.ai.compute(ai, applePts, forbidden);
    ai.setPending(best);
    const newHead = ai.move(false);
    this.resolveMove(ai, newHead);
  }

  private resolveMove(snake: Snake, head: Point): void {
    // Border
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) {
      snake.alive = false;
      return;
    }
    // Static obstacle
    if (this.staticCells.has(`${head.x},${head.y}`)) {
      snake.alive = false;
      return;
    }
    // Apple
    const ai = this.apples.findIndex((a) => a.pos.x === head.x && a.pos.y === head.y);
    if (ai !== -1) {
      const apple = this.apples.splice(ai, 1)[0];
      snake.addScore(apple.points * this.level * SCORE_PER_APPLE_PER_LEVEL);
      // grow
      const tail = snake.body[snake.body.length - 1];
      snake.body.push({ ...tail });
      this.spawnOneApple();
    }
  }

  private checkCollisions(): void {
    // Build occupied cells (all bodies excluding heads)
    const occupied = new Map<string, string>();
    for (const [sid, snake] of this.snakes) {
      if (!snake.alive) continue;
      for (let i = 1; i < snake.body.length; i++) {
        occupied.set(`${snake.body[i].x},${snake.body[i].y}`, sid);
      }
    }
    // Head hits body
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      const hk = `${snake.head.x},${snake.head.y}`;
      if (occupied.has(hk)) snake.alive = false;
    }
    // Head-to-head
    const living = [...this.snakes.values()].filter((s) => s.alive);
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i], b = living[j];
        if (a.head.x === b.head.x && a.head.y === b.head.y) {
          a.alive = false;
          b.alive = false;
        }
      }
    }
  }

  private checkLevelUp(): void {
    const threshold = LEVEL_UP_THRESHOLD * this.level;
    const humans = [...this.snakes.values()].filter(
      (s) => s.type === "PLAYER" && s.alive,
    );
    if (humans.length === 0) return;
    if (humans.every((s) => s.score >= threshold) && this.level < TOTAL_LEVELS) {
      this.level++;
      humans.forEach((s) => (s.level = this.level));
      this.loadLevel(this.level);
      this.spawnApples();
      this.status = "LEVEL_COMPLETE";
      this.emit("levelComplete");
      setTimeout(() => {
        if (this.status === "LEVEL_COMPLETE") this.status = "RUNNING";
      }, LEVEL_PAUSE_MS);
    }
  }

  private checkGameOver(): void {
    const humans = [...this.snakes.values()].filter((s) => s.type === "PLAYER");
    const aliveHumans = humans.filter((s) => s.alive);

    let gameOver = false;
    let winner: string | null = null;

    if (aliveHumans.length === 0) {
      gameOver = true;
    } else if (this.mode === "MULTIPLAYER" && aliveHumans.length === 1) {
      winner = aliveHumans[0].name;
      gameOver = true;
    } else if (this.level === TOTAL_LEVELS) {
      const threshold = LEVEL_UP_THRESHOLD * TOTAL_LEVELS;
      if (aliveHumans.every((s) => s.score >= threshold)) {
        winner = [...aliveHumans].sort((a, b) => b.score - a.score)[0]?.name ?? null;
        gameOver = true;
      }
    }

    if (gameOver) {
      this.stop();
      this.emit("gameOver", winner);
    }
  }

  // --- Level loading ---

  private loadLevel(level: number): void {
    const def = LEVELS[level - 1] ?? [];
    this.obstacles = def.map((d) => ({
      ...d,
      cells: d.cells.map((c) => ({ ...c })),
      moveCounter: 0,
    }));
    this.rebuildStatic();
  }

  private rebuildStatic(): void {
    this.staticCells.clear();
    for (const obs of this.obstacles) {
      for (const c of obs.cells) this.staticCells.add(`${c.x},${c.y}`);
    }
  }

  // --- Apple spawning ---

  private spawnApples(): void {
    this.apples = [];
    const count = Math.min(this.level + 1, MAX_APPLES);
    for (let i = 0; i < count; i++) this.spawnOneApple();
  }

  private spawnOneApple(): void {
    if (this.apples.length >= MAX_APPLES) return;
    const forbidden = new Set(this.staticCells);
    for (const a of this.apples) forbidden.add(`${a.pos.x},${a.pos.y}`);
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      for (const p of snake.body) forbidden.add(`${p.x},${p.y}`);
      // Don't spawn in front of snake
      const d: Record<Direction, Point> = {
        UP:{x:0,y:-1}, DOWN:{x:0,y:1}, LEFT:{x:-1,y:0}, RIGHT:{x:1,y:0},
      };
      const delta = d[snake.direction];
      [1, 2].forEach((n) => {
        forbidden.add(`${snake.head.x + delta.x * n},${snake.head.y + delta.y * n}`);
      });
    }

    for (let attempt = 0; attempt < 300; attempt++) {
      const x = 1 + Math.floor(this.rng() * (GRID_W - 2));
      const y = 1 + Math.floor(this.rng() * (GRID_H - 2));
      if (!forbidden.has(`${x},${y}`)) {
        const idx = this.apples.length % APPLE_COLORS.length;
        this.apples.push({
          pos: { x, y },
          color: APPLE_COLORS[idx],
          points: idx + 1,
        });
        return;
      }
    }
  }

  // --- Helpers ---

  private startPos(idx: number): Point {
    const positions: Point[] = [
      { x: 5, y: Math.floor(GRID_H / 2) },
      { x: GRID_W - 5, y: Math.floor(GRID_H / 2) },
      { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) },
    ];
    return positions[idx] ?? positions[0];
  }

  private buildForbidden(self: Snake): Set<string> {
    const s = new Set(this.staticCells);
    for (const [, other] of this.snakes) {
      if (other === self) continue;
      if (other.alive) for (const p of other.body) s.add(`${p.x},${p.y}`);
    }
    for (let i = 0; i < self.body.length - 1; i++) {
      s.add(`${self.body[i].x},${self.body[i].y}`);
    }
    return s;
  }

  // --- Event emission helpers ---

  private emit(event: "state" | "levelComplete" | "gameOver", payload?: unknown): void {
    for (const h of this.handlers) {
      if (event === "state") h.onState(this);
      if (event === "levelComplete") h.onLevelComplete(this, this.level);
      if (event === "gameOver") h.onGameOver(this, payload as string | null);
    }
  }

  addHandlers(h: GameEventHandlers): void { this.handlers.push(h); }
  removeHandlers(h: GameEventHandlers): void {
    this.handlers = this.handlers.filter((x) => x !== h);
  }

  // --- Serialization ---

  toSnakeStates(): SnakeState[] {
    return [...this.snakes.values()].map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      color: s.color,
      alive: s.alive,
      score: s.score,
      direction: s.direction,
      body: s.body.map((p) => [p.x, p.y] as [number, number]),
    }));
  }

  toAppleStates(): AppleState[] {
    return this.apples.map((a) => ({
      x: a.pos.x,
      y: a.pos.y,
      color: a.color,
      points: a.points,
    }));
  }

  toObstacleStates(): ObstacleState[] {
    return this.obstacles.map((o) => ({
      type: o.type,
      cells: o.cells.map((c) => [c.x, c.y] as [number, number]),
    }));
  }
}
