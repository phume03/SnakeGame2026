# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Java Snake Game (artifacts/snake-game)

A complete Java 8 + Struts 2 + WebSocket multiplayer snake game built as a deployable WAR.

- **Language**: Java 8 (compiled with `-source 1.8 -target 1.8`)
- **Framework**: Apache Struts 2.5.33 (convention plugin, JSON plugin)
- **Real-time**: JSR-356 WebSocket (`@ServerEndpoint`)
- **Database**: H2 in-memory (leaderboard, resets on restart)
- **Serialization**: Jackson ObjectMapper
- **Build**: Maven → produces `target/snake-game.war`
- **Run dev**: `mvn tomcat7:run` (embedded Tomcat 7; deploy WAR to Tomcat 8 for production)
- **Context path**: `/snake`
- **Features**: Single player vs AI (BFS), Multiplayer (3 players/world, auto-matchmaking), 10 deterministic levels, warp mechanic (double-tap), up to 5 colored apples, leaderboard

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with a full multiplayer Snake game engine.

- Entry: `src/index.ts` — creates HTTP server, attaches WebSocket, reads `PORT`
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- WebSocket: `src/websocket.ts` — ws server at `/api/ws/game`, handles JOIN_SINGLE, JOIN_MULTI, START, INPUT
- Routes: `src/routes/leaderboard.ts` → `GET /api/leaderboard`, `GET /api/leaderboard/player/:name`, `GET /api/leaderboard/matches`
- Routes: `src/routes/worlds.ts` → `GET /api/worlds`
- Game engine: `src/game/`
  - `constants.ts` — all game constants (source of truth for sync script)
  - `levels.ts` — 10 level obstacle definitions (source of truth for sync script)
  - `types.ts` — shared TypeScript types
  - `snake.ts` — Snake class with double-tap warp logic
  - `ai.ts` — BFS AI controller
  - `world.ts` — GameWorld (game loop, collision, scoring, level progression)
  - `worldManager.ts` — singleton matchmaking manager
  - `leaderboard.ts` — in-memory leaderboard store
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/snake-arena` (`@workspace/snake-arena`)

React + Vite frontend for Snake Arena. The preview proxy forwards `/api` to the api-server on port 8080.

- Home page (`/`): mode selection (single-player vs multiplayer), leaderboard preview, active-worlds badge
- Game page (`/game`): full-screen canvas game via WebSocket (`/api/ws/game`)
- Leaderboard page (`/leaderboard`): full scores table + recent matches
- WebSocket hook: `src/hooks/use-game-websocket.ts` — handles all message types
- Canvas rendering: `src/components/game/SnakeCanvas.tsx`

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

- `scripts/src/sync-to-java.mjs` — reads `constants.ts` + `levels.ts` from api-server game engine, regenerates `GameConstants.java` + `LevelDesigner.java` in the Java project, patches constants in `GameWorld.java`, then runs `mvn package -DskipTests` to rebuild the WAR. Run with: `node scripts/src/sync-to-java.mjs`
