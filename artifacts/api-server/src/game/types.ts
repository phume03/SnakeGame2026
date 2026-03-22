export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type SnakeType = "PLAYER" | "AI";
export type ObstacleType = "WALL" | "MOVING_BLOCK";
export type GameMode = "SINGLE_PLAYER" | "MULTIPLAYER";
export type GameStatus = "WAITING" | "RUNNING" | "PAUSED" | "LEVEL_COMPLETE" | "GAME_OVER";

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  id: string;
  name: string;
  type: SnakeType;
  color: string;
  alive: boolean;
  score: number;
  direction: Direction;
  body: [number, number][];
}

export interface AppleState {
  x: number;
  y: number;
  color: string;
  points: number;
}

export interface ObstacleState {
  type: ObstacleType;
  cells: [number, number][];
}

export interface GameStateMsg {
  type: "STATE";
  worldId: string;
  status: GameStatus;
  level: number;
  gridW: number;
  gridH: number;
  snakes: SnakeState[];
  apples: AppleState[];
  obstacles: ObstacleState[];
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  level: number;
  gameMode: string;
  playedAt: string;
}

export interface MatchRecord {
  worldId: string;
  playerNames: string[];
  winnerName: string | null;
  gameMode: string;
  playedAt: string;
}
