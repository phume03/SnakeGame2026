import { GameWorld } from "./world.js";
import type { GameMode, MatchRecord } from "./types.js";

class WorldManager {
  private static instance: WorldManager;
  private worlds = new Map<string, GameWorld>();
  private sessionToWorld = new Map<string, string>();
  private counter = 0;

  static getInstance(): WorldManager {
    if (!WorldManager.instance) WorldManager.instance = new WorldManager();
    return WorldManager.instance;
  }

  createSinglePlayer(sessionId: string, playerName: string): GameWorld {
    const wid = `sp-${++this.counter}`;
    const world = new GameWorld(wid, "SINGLE_PLAYER");
    world.addPlayer(sessionId, playerName);
    this.worlds.set(wid, world);
    this.sessionToWorld.set(sessionId, wid);
    return world;
  }

  joinMultiplayer(sessionId: string, playerName: string): GameWorld {
    // Find waiting world with room
    let target: GameWorld | undefined;
    for (const w of this.worlds.values()) {
      if (w.mode === "MULTIPLAYER" && w.status === "WAITING" && !w.isFull) {
        target = w;
        break;
      }
    }
    if (!target) {
      const wid = `mp-${++this.counter}`;
      target = new GameWorld(wid, "MULTIPLAYER");
      this.worlds.set(wid, target);
    }
    target.addPlayer(sessionId, playerName);
    this.sessionToWorld.set(sessionId, target.worldId);
    return target;
  }

  getWorldForSession(sessionId: string): GameWorld | undefined {
    const wid = this.sessionToWorld.get(sessionId);
    return wid ? this.worlds.get(wid) : undefined;
  }

  getWorld(worldId: string): GameWorld | undefined {
    return this.worlds.get(worldId);
  }

  removeSession(sessionId: string): void {
    const wid = this.sessionToWorld.get(sessionId);
    this.sessionToWorld.delete(sessionId);
    if (!wid) return;
    const world = this.worlds.get(wid);
    if (!world) return;
    world.removePlayer(sessionId);
    if (world.playerCount === 0) {
      world.stop();
      this.worlds.delete(wid);
    }
  }

  getStats(): { totalWorlds: number; waitingWorlds: number; runningWorlds: number; totalPlayers: number } {
    let waiting = 0, running = 0, players = 0;
    for (const w of this.worlds.values()) {
      if (w.status === "WAITING") waiting++;
      else if (w.status === "RUNNING" || w.status === "LEVEL_COMPLETE") running++;
      players += w.playerCount;
    }
    return {
      totalWorlds: this.worlds.size,
      waitingWorlds: waiting,
      runningWorlds: running,
      totalPlayers: players,
    };
  }

  get allWorlds() { return this.worlds; }
}

export const worldManager = WorldManager.getInstance();
