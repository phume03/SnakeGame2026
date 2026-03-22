// ============================================================
// GAME CONSTANTS — edited here, synced to Java by sync-to-java.mjs
// ============================================================

export const GRID_W = 40;
export const GRID_H = 30;
export const MAX_PLAYERS = 3;
export const MAX_APPLES = 5;
export const TOTAL_LEVELS = 10;
export const TICK_RATE_MS = 100;           // game loop interval
export const DOUBLE_TAP_THRESHOLD_MS = 400; // window for warp double-tap
export const LEVEL_PAUSE_MS = 2000;         // pause between levels
export const SCORE_PER_APPLE_PER_LEVEL = 1; // base multiplier: score += pointValue * level
export const LEVEL_UP_THRESHOLD = 50;       // score per level needed to advance (multiplied by level)
export const INITIAL_SNAKE_LENGTH = 3;

export const SNAKE_COLORS = ["#00FF88", "#FF6B35", "#4ECDC4"] as const;
export const APPLE_COLORS = ["red", "green", "gold", "orange", "crimson"] as const;
export const AI_COLOR = "#FF4444";
