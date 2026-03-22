import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { worldManager } from "./game/worldManager.js";
import { leaderboard } from "./game/leaderboard.js";
import type { GameWorld } from "./game/world.js";
import type { GameEventHandlers } from "./game/world.js";
import type { Direction } from "./game/types.js";
import { logger } from "./lib/logger.js";
import {
  GRID_W, GRID_H,
} from "./game/constants.js";

interface ClientMeta {
  sessionId: string;
  ws: WebSocket;
  handlers?: GameEventHandlers;
}

function send(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function buildStateMsg(world: GameWorld) {
  return {
    type: "STATE",
    worldId: world.worldId,
    status: world.status,
    level: world.level,
    gridW: GRID_W,
    gridH: GRID_H,
    snakes: world.toSnakeStates(),
    apples: world.toAppleStates(),
    obstacles: world.toObstacleStates(),
  };
}

function makeHandlers(ws: WebSocket, sessionId: string): GameEventHandlers {
  return {
    onState(world) {
      send(ws, buildStateMsg(world));
    },
    onGameOver(world, winner) {
      // Persist scores
      for (const snake of world.snakes.values()) {
        if (snake.type === "PLAYER") {
          leaderboard.saveScore({
            playerName: snake.name,
            score: snake.score,
            level: world.level,
            gameMode: world.mode,
          });
        }
      }
      leaderboard.recordMatch({
        worldId: world.worldId,
        playerNames: world.allPlayers,
        winnerName: winner,
        gameMode: world.mode,
      });
      send(ws, { type: "GAME_OVER", winner: winner ?? "Nobody" });
    },
    onLevelComplete(_world, newLevel) {
      send(ws, { type: "LEVEL_COMPLETE", newLevel });
    },
  };
}

function broadcastToWorld(world: GameWorld, msg: unknown, clients: Map<string, ClientMeta>): void {
  for (const [sid] of world.snakes) {
    const meta = clients.get(sid);
    if (meta) send(meta.ws, msg);
  }
}

export function setupWebSocket(server: import("http").Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws/game" });
  const clients = new Map<string, ClientMeta>();
  let uidCounter = 0;

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    const sessionId = `sess-${Date.now()}-${++uidCounter}`;
    clients.set(sessionId, { sessionId, ws });

    send(ws, { type: "CONNECTED", sessionId });
    logger.info({ sessionId }, "WS connected");

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(String(raw)); }
      catch { return; }

      const action = msg.action as string | undefined;
      if (!action) return;

      switch (action) {
        case "JOIN_SINGLE": {
          const name = sanitize(msg.playerName as string) || "Player";
          const world = worldManager.createSinglePlayer(sessionId, name);
          const handlers = makeHandlers(ws, sessionId);
          world.addHandlers(handlers);
          clients.set(sessionId, { ...clients.get(sessionId)!, handlers });
          send(ws, { type: "JOINED", message: `Joined single-player game as ${name}` });
          break;
        }
        case "JOIN_MULTI": {
          const name = sanitize(msg.playerName as string) || "Player";
          const world = worldManager.joinMultiplayer(sessionId, name);
          const handlers = makeHandlers(ws, sessionId);
          world.addHandlers(handlers);
          clients.set(sessionId, { ...clients.get(sessionId)!, handlers });
          const count = world.playerCount;
          send(ws, {
            type: "JOINED",
            message: `Joined world ${world.worldId} (${count}/3 players)`,
            worldId: world.worldId,
            playerCount: count,
          });
          if (world.isFull) {
            world.start();
            broadcastToWorld(world, { type: "STARTING", message: "World is full — game starting!" }, clients);
          }
          break;
        }
        case "START": {
          const world = worldManager.getWorldForSession(sessionId);
          if (!world) return;
          if (world.mode === "MULTIPLAYER") {
            send(ws, { type: "INFO", message: "Multiplayer starts automatically when 3 players join" });
            return;
          }
          if (world.status === "WAITING") world.start();
          break;
        }
        case "INPUT": {
          const dir = String(msg.direction).toUpperCase() as Direction;
          if (["UP", "DOWN", "LEFT", "RIGHT"].includes(dir)) {
            worldManager.getWorldForSession(sessionId)?.handleInput(sessionId, dir);
          }
          break;
        }
      }
    });

    ws.on("close", () => {
      logger.info({ sessionId }, "WS closed");
      const meta = clients.get(sessionId);
      const world = worldManager.getWorldForSession(sessionId);
      if (meta?.handlers && world) world.removeHandlers(meta.handlers);
      clients.delete(sessionId);
      worldManager.removeSession(sessionId);
    });

    ws.on("error", (err) => {
      logger.error({ sessionId, err }, "WS error");
    });
  });

  logger.info("WebSocket server attached at /api/ws/game");
}

function sanitize(s?: string): string {
  if (!s) return "";
  return s.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 20);
}
