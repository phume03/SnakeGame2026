# Multiplayer Snake Game — Java 8 + Struts 2 + Tomcat 8

A feature-complete multiplayer snake game built with Java 8, Apache Struts 2.5, and WebSocket, deployable on Apache Tomcat 8.

## Features

- **Single Player**: Play against an AI snake with BFS pathfinding through 10 unique levels
- **Multiplayer**: Up to 3 players per world; auto-matchmaking creates new worlds for every 3 players
- **10 Consistent Levels**: Same layouts every play-through — from open field to moving obstacle mazes
- **Warp Mechanic**: Double-tap a direction key to warp your snake 1–2 spaces forward
- **Up to 5 Colored Apples**: Respawn away from snakes, not in front of them
- **Real-time WebSocket**: Game state pushed to all players at 10 ticks/second
- **Leaderboard**: H2 in-memory database, persist scores and match history per server session
- **AI Snake**: BFS-based pathfinding that avoids walls, obstacles, and other snakes

## Project Structure

```
snake-game/
├── pom.xml                          Maven project file
├── src/main/
│   ├── java/com/snakegame/
│   │   ├── action/                  Struts 2 action classes
│   │   │   ├── HomeAction.java      Home page (leaderboard preview)
│   │   │   ├── GameAction.java      Game page (single/multi)
│   │   │   └── LeaderboardAction.java
│   │   ├── game/
│   │   │   ├── GameWorld.java       Core game loop (10 ticks/sec)
│   │   │   ├── WorldManager.java    Singleton: manages all worlds + matchmaking
│   │   │   ├── LevelDesigner.java   Deterministic level obstacle layouts
│   │   │   └── AISnakeController.java  BFS AI for system snake
│   │   ├── model/
│   │   │   ├── Snake.java           Snake model + warp mechanic + double-tap
│   │   │   ├── Apple.java           Colored apples with point values
│   │   │   ├── Obstacle.java        Static walls + moving blocks
│   │   │   ├── Point.java
│   │   │   ├── Direction.java
│   │   │   ├── LeaderboardEntry.java
│   │   │   └── MatchRecord.java
│   │   ├── websocket/
│   │   │   └── GameWebSocket.java   JSR-356 WebSocket endpoint at /ws/game
│   │   ├── util/
│   │   │   ├── DatabaseManager.java H2 in-memory DB (leaderboard)
│   │   │   └── JsonSerializer.java  Jackson JSON game state serializer
│   │   └── listener/
│   │       └── AppStartupListener.java  Servlet context listener
│   ├── resources/
│   │   ├── struts.xml              Struts 2 action configuration
│   │   └── logback.xml             Logging configuration
│   └── webapp/
│       ├── WEB-INF/
│       │   ├── web.xml             Servlet descriptor
│       │   └── jsp/
│       │       ├── home.jsp        Landing page with leaderboard
│       │       ├── game.jsp        Game canvas + WebSocket client
│       │       └── leaderboard.jsp Full leaderboard page
│       ├── css/
│       │   ├── style.css           Global dark theme styles
│       │   └── game.css            Game-specific canvas UI
│       └── index.jsp               Root redirect
└── target/
    └── snake-game.war              Built WAR (deploy this to Tomcat)
```

## Building

### Prerequisites
- Java 8 (JDK 1.8)
- Apache Maven 3.6+

### Build the WAR
```bash
cd snake-game
mvn clean package -DskipTests
```

Output: `target/snake-game.war`

### Run in Development (Embedded Tomcat 7 for testing)
```bash
mvn tomcat7:run
```
Then open: http://localhost:8080/snake/

## Deployment to Tomcat 8

1. Copy `target/snake-game.war` to your Tomcat `webapps/` directory:
   ```bash
   cp target/snake-game.war /opt/tomcat/webapps/snake.war
   ```

2. Start Tomcat:
   ```bash
   /opt/tomcat/bin/startup.sh
   ```

3. Open your browser: `http://your-server:8080/snake/`

### Context Path
The app deploys at `/snake`. To change, rename the WAR file (e.g., `ROOT.war` for root context).

### Tomcat 8 WebSocket Requirement
WebSocket support (JSR-356) is included by default in Tomcat 8+. No extra configuration needed.

## Gameplay

### Single Player
1. Enter your name → click **Single Player**
2. Click **Start Game**
3. Navigate your snake to eat apples; avoid the AI, walls, and obstacles
4. Score enough points to advance through 10 levels

### Multiplayer
1. Enter your name → click **Multiplayer**
2. Wait for 2 more players to join (the world auto-starts when full)
3. Up to 3 players per world; new worlds created automatically for additional players
4. Last snake standing wins!

### Controls
| Key | Action |
|-----|--------|
| `↑` / `W` | Move Up |
| `↓` / `S` | Move Down |
| `←` / `A` | Move Left |
| `→` / `D` | Move Right |
| Double-tap direction | **Warp** 1–2 spaces forward |

### Level Progression
| Level | Features |
|-------|----------|
| 1 | Open field — just snakes and apples |
| 2 | Single horizontal wall |
| 3 | Cross-shaped obstacle |
| 4 | Four corner blocks |
| 5 | Alternating vertical walls with gaps |
| 6 | Spiral-style walls |
| 7 | First moving blocks + static walls |
| 8 | Maze-like structure |
| 9 | Dense walls + 2 moving blocks |
| 10 | Double ring walls + 3 fast moving blocks |

### Multiplayer World Logic
- Every 3 players: 1 new world is created
- 4 players → 2 worlds (1 with 3 players, 1 with 1 player waiting)
- 6 players → 2 worlds (3 players each)
- 7 players → 3 worlds (3 + 3 + 1)

(Per spec: worlds start when full at 3. The 7-player case creates 3 worlds — 2 start immediately with 3 players, 1 waits for 2 more.)

## Architecture Notes

- **Game Loop**: `ScheduledExecutorService` runs at 10 ticks/second per world
- **WebSocket**: `@ServerEndpoint` at `/ws/game` — Tomcat 8 auto-registers via annotation scanning
- **Thread Safety**: All game world mutations are `synchronized`; observer list uses `CopyOnWriteArrayList`
- **Persistence**: H2 in-memory DB — scores reset on server restart. For persistent storage, replace with MySQL/PostgreSQL
- **Determinism**: All level layouts are hardcoded (not random), ensuring consistent play across all sessions
