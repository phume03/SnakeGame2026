<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="s" uri="/struts-tags" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snake Game</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/game.css">
</head>
<body class="game-page">
    <div class="game-wrapper">
        <!-- Header Bar -->
        <div class="game-header">
            <a href="${pageContext.request.contextPath}/index" class="btn btn-sm">← Home</a>
            <div class="game-info">
                <span class="info-badge">Mode: <strong id="modeDisplay">-</strong></span>
                <span class="info-badge">Level: <strong id="levelDisplay">-</strong></span>
                <span class="info-badge">World: <strong id="worldDisplay">-</strong></span>
            </div>
        </div>

        <!-- Game Canvas -->
        <div class="canvas-container">
            <canvas id="gameCanvas" width="800" height="600"></canvas>

            <!-- Overlay panels -->
            <div id="overlay" class="game-overlay">
                <div class="overlay-content">
                    <div id="overlayIcon" class="overlay-icon">🐍</div>
                    <h2 id="overlayTitle">Snake Arena</h2>
                    <p id="overlayMsg">Connecting to game server...</p>
                    <button id="overlayBtn" class="btn btn-primary" style="display:none;" onclick="startGame()">
                        Start Game
                    </button>
                </div>
            </div>

            <!-- Level transition overlay -->
            <div id="levelOverlay" class="level-overlay" style="display:none;">
                <div class="level-content">
                    <div class="level-badge">LEVEL</div>
                    <div class="level-number" id="levelNum">2</div>
                    <p>Get ready!</p>
                </div>
            </div>
        </div>

        <!-- Scoreboard sidebar -->
        <div class="scoreboard">
            <h3>Scoreboard</h3>
            <div id="playerScores" class="player-scores"></div>

            <div class="game-stats">
                <div class="stat-item">
                    <span class="stat-label">Level</span>
                    <span class="stat-value" id="statLevel">1</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Apples</span>
                    <span class="stat-value" id="statApples">0</span>
                </div>
            </div>

            <div class="controls-ref">
                <h4>Controls</h4>
                <p><kbd>Arrow Keys</kbd> — Move</p>
                <p><kbd>Double-tap</kbd> — Warp</p>
            </div>

            <div class="level-progress">
                <h4>Level Progress</h4>
                <div class="dots" id="levelDots"></div>
            </div>
        </div>
    </div>

    <script>
    (function() {
        // Configuration
        var CTX_PATH = '${pageContext.request.contextPath}';
        var GAME_MODE = '${mode}'; // SINGLE or MULTI
        var PLAYER_NAME = decodeURIComponent(getQueryParam('playerName') || 'Player');
        var GRID_W = 40, GRID_H = 30;
        var CELL_SIZE;
        var mySessionId = null;
        var ws = null;
        var gameState = null;
        var lastDirectionTime = {};
        var lastDirection = null;
        var animFrame = null;

        // Canvas
        var canvas = document.getElementById('gameCanvas');
        var ctx = canvas.getContext('2d');

        function resizeCanvas() {
            var container = canvas.parentElement;
            var maxW = container.clientWidth - 10;
            var maxH = container.clientHeight - 10;
            var cellW = Math.floor(maxW / GRID_W);
            var cellH = Math.floor(maxH / GRID_H);
            CELL_SIZE = Math.min(cellW, cellH, 24);
            canvas.width  = GRID_W * CELL_SIZE;
            canvas.height = GRID_H * CELL_SIZE;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // UI refs
        var overlay       = document.getElementById('overlay');
        var overlayTitle  = document.getElementById('overlayTitle');
        var overlayMsg    = document.getElementById('overlayMsg');
        var overlayBtn    = document.getElementById('overlayBtn');
        var overlayIcon   = document.getElementById('overlayIcon');
        var levelOverlay  = document.getElementById('levelOverlay');
        var playerScores  = document.getElementById('playerScores');
        var statLevel     = document.getElementById('statLevel');
        var statApples    = document.getElementById('statApples');
        var levelDots     = document.getElementById('levelDots');

        // Init dots
        var dotsHtml = '';
        for (var i = 1; i <= 10; i++) dotsHtml += '<span class="dot" id="dot' + i + '"></span>';
        levelDots.innerHTML = dotsHtml;

        document.getElementById('modeDisplay').textContent = GAME_MODE === 'SINGLE' ? 'Single Player' : 'Multiplayer';

        // --- WebSocket Connection ---
        function connect() {
            var proto = location.protocol === 'https:' ? 'wss' : 'ws';
            var wsUrl = proto + '://' + location.host + CTX_PATH + '/ws/game';
            ws = new WebSocket(wsUrl);

            ws.onopen = function() {
                setOverlay('🐍', 'Connected!', 'Joining game...');
                var joinAction = GAME_MODE === 'SINGLE' ? 'JOIN_SINGLE' : 'JOIN_MULTI';
                ws.send(JSON.stringify({ action: joinAction, playerName: PLAYER_NAME }));
            };

            ws.onmessage = function(event) {
                handleMessage(JSON.parse(event.data));
            };

            ws.onerror = function() {
                setOverlay('❌', 'Connection Error', 'Failed to connect to game server. Check that the server is running.');
            };

            ws.onclose = function() {
                stopLoop();
                if (gameState && gameState.status === 'GAME_OVER') return;
                setOverlay('🔌', 'Disconnected', 'Connection lost.');
            };
        }

        function handleMessage(msg) {
            switch (msg.type) {
                case 'CONNECTED':
                    mySessionId = msg.sessionId;
                    break;

                case 'JOINED':
                    if (GAME_MODE === 'SINGLE') {
                        setOverlay('🐍', 'Ready!', 'Press Start to begin single-player');
                        overlayBtn.style.display = 'inline-block';
                    } else {
                        setOverlay('⏳', 'Waiting...', msg.message + '\nWaiting for players to join. Game starts at 3 players.');
                    }
                    break;

                case 'STARTING':
                    setOverlay('🚀', 'Starting!', 'Game is starting!');
                    setTimeout(function() { overlay.style.display = 'none'; }, 1500);
                    break;

                case 'STATE':
                    gameState = msg;
                    document.getElementById('worldDisplay').textContent = msg.worldId || '-';
                    document.getElementById('levelDisplay').textContent = msg.level || '-';
                    statLevel.textContent = msg.level || '-';
                    statApples.textContent = (msg.apples || []).length;

                    // Update level dots
                    for (var i = 1; i <= 10; i++) {
                        var dot = document.getElementById('dot' + i);
                        if (dot) dot.className = 'dot' + (i <= msg.level ? ' active' : '');
                    }

                    updateScoreboard(msg.snakes);
                    overlay.style.display = 'none';
                    if (!animFrame) loop();
                    break;

                case 'LEVEL_COMPLETE':
                    showLevelTransition(msg.newLevel);
                    break;

                case 'GAME_OVER':
                    stopLoop();
                    var winner = msg.winner || 'Nobody';
                    var isWinner = gameState && gameState.snakes &&
                        gameState.snakes.some(function(s) {
                            return s.id === mySessionId && s.alive;
                        });
                    setOverlay(
                        isWinner ? '🏆' : '💀',
                        isWinner ? 'You Win!' : 'Game Over',
                        winner !== 'Nobody' ? 'Winner: ' + winner : 'Game over!'
                    );
                    overlay.innerHTML += '<div style="margin-top:20px"><a href="' + CTX_PATH + '/index" class="btn btn-primary">Back to Menu</a> <a href="' + CTX_PATH + '/leaderboard/top" class="btn btn-secondary">Leaderboard</a></div>';
                    overlay.style.display = 'flex';
                    break;

                case 'INFO':
                case 'ERROR':
                    console.log(msg.type + ':', msg.message);
                    break;
            }
        }

        window.startGame = function() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'START' }));
                overlay.style.display = 'none';
            }
        };

        // --- Input Handling ---
        var KEY_MAP = {
            ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
            'w': 'UP', 's': 'DOWN', 'a': 'LEFT', 'd': 'RIGHT',
            'W': 'UP', 'S': 'DOWN', 'A': 'LEFT', 'D': 'RIGHT'
        };

        var DOUBLE_TAP_MS = 350;

        document.addEventListener('keydown', function(e) {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            var dir = KEY_MAP[e.key];
            if (!dir) return;
            e.preventDefault();

            ws.send(JSON.stringify({ action: 'INPUT', direction: dir }));
        });

        // --- Rendering ---
        function loop() {
            animFrame = requestAnimationFrame(loop);
            render();
        }

        function stopLoop() {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
        }

        function render() {
            if (!gameState) return;
            var state = gameState;
            var cs = CELL_SIZE;
            var W = state.gridW || GRID_W;
            var H = state.gridH || GRID_H;

            // Background
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            for (var x = 0; x <= W; x++) {
                ctx.beginPath(); ctx.moveTo(x*cs, 0); ctx.lineTo(x*cs, H*cs); ctx.stroke();
            }
            for (var y = 0; y <= H; y++) {
                ctx.beginPath(); ctx.moveTo(0, y*cs); ctx.lineTo(W*cs, y*cs); ctx.stroke();
            }

            // Obstacles
            (state.obstacles || []).forEach(function(obs) {
                obs.cells.forEach(function(cell) {
                    if (obs.type === 'MOVING_BLOCK') {
                        ctx.fillStyle = '#FF6B00';
                        ctx.shadowColor = '#FF6B00';
                        ctx.shadowBlur = 4;
                    } else {
                        ctx.fillStyle = '#4A4A6A';
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                    }
                    ctx.fillRect(cell[0]*cs + 1, cell[1]*cs + 1, cs - 2, cs - 2);
                });
            });
            ctx.shadowBlur = 0;

            // Apples
            (state.apples || []).forEach(function(apple) {
                var x = apple.x * cs + cs/2;
                var y = apple.y * cs + cs/2;
                var r = cs * 0.4;
                var grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
                var c = apple.color || 'red';
                grad.addColorStop(0, lighten(c));
                grad.addColorStop(1, c);
                ctx.fillStyle = grad;
                ctx.shadowColor = c;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Stem
                ctx.strokeStyle = '#5D4037';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r*0.3, y - r*1.4);
                ctx.stroke();
            });

            // Snakes
            (state.snakes || []).forEach(function(snake) {
                if (!snake.body || snake.body.length === 0) return;
                var col = snake.color || '#00FF88';
                var alpha = snake.alive ? 1.0 : 0.35;

                snake.body.forEach(function(seg, i) {
                    var isHead = i === 0;
                    var isTail = i === snake.body.length - 1;
                    var px = seg[0] * cs, py = seg[1] * cs;

                    if (isHead) {
                        ctx.shadowColor = col;
                        ctx.shadowBlur = 12;
                        ctx.fillStyle = shiftHue(col, 30);
                    } else {
                        ctx.shadowBlur = 0;
                        var t = 1 - (i / snake.body.length) * 0.6;
                        ctx.fillStyle = alphaColor(col, alpha * t);
                    }

                    var margin = isHead ? 1 : 2;
                    var rr = isHead ? 4 : 3;
                    roundRect(ctx, px + margin, py + margin, cs - 2*margin, cs - 2*margin, rr);
                    ctx.fill();

                    if (isHead) {
                        ctx.shadowBlur = 0;
                        drawEyes(ctx, seg, snake.direction, cs, alpha);
                    }
                });

                // Name tag above head
                if (snake.alive) {
                    var hx = snake.body[0][0] * cs + cs/2;
                    var hy = snake.body[0][1] * cs;
                    ctx.font = 'bold ' + Math.max(9, cs * 0.5) + 'px monospace';
                    ctx.fillStyle = col;
                    ctx.textAlign = 'center';
                    ctx.fillText(snake.name || '', hx, hy - 3);
                }
            });

            ctx.textAlign = 'left';
        }

        function drawEyes(ctx, seg, dir, cs, alpha) {
            var x = seg[0] * cs + cs/2;
            var y = seg[1] * cs + cs/2;
            var r = cs * 0.12;
            var off = cs * 0.2;

            var ox = 0, oy = 0;
            if (dir === 'RIGHT' || dir === 'LEFT') {
                oy = off;
                ox = dir === 'RIGHT' ? off * 0.5 : -off * 0.5;
            } else {
                ox = off;
                oy = dir === 'DOWN' ? off * 0.5 : -off * 0.5;
            }

            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(x + ox, y - oy, r, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x - ox, y + oy, r, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(x + ox*1.1, y - oy*1.1, r*0.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x - ox*1.1, y + oy*1.1, r*0.5, 0, Math.PI*2); ctx.fill();
        }

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function alphaColor(hex, alpha) {
            var r = parseInt(hex.slice(1, 3), 16);
            var g = parseInt(hex.slice(3, 5), 16);
            var b = parseInt(hex.slice(5, 7), 16);
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }

        function lighten(color) {
            if (color.startsWith('#')) {
                var r = Math.min(255, parseInt(color.slice(1,3), 16) + 60);
                var g = Math.min(255, parseInt(color.slice(3,5), 16) + 60);
                var b = Math.min(255, parseInt(color.slice(5,7), 16) + 60);
                return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
            }
            return color;
        }

        function shiftHue(hex, deg) { return lighten(hex); }

        function updateScoreboard(snakes) {
            if (!snakes) return;
            var html = '';
            snakes.forEach(function(s) {
                html += '<div class="score-row' + (s.id === mySessionId ? ' me' : '') + '">' +
                    '<span class="snake-dot" style="background:' + (s.color || '#fff') + '"></span>' +
                    '<span class="sname">' + (s.name || 'Snake') + (s.id === mySessionId ? ' (You)' : '') + '</span>' +
                    '<span class="sscore">' + (s.score || 0) + '</span>' +
                    (s.alive ? '' : '<span class="dead-tag">💀</span>') +
                    '</div>';
            });
            playerScores.innerHTML = html;
        }

        function setOverlay(icon, title, msg) {
            overlayIcon.textContent = icon;
            overlayTitle.textContent = title;
            overlayMsg.textContent = msg;
            overlayBtn.style.display = 'none';
            overlay.style.display = 'flex';
        }

        function showLevelTransition(level) {
            document.getElementById('levelNum').textContent = level;
            levelOverlay.style.display = 'flex';
            setTimeout(function() { levelOverlay.style.display = 'none'; }, 2000);
        }

        function getQueryParam(name) {
            var url = new URL(window.location.href);
            return url.searchParams.get(name);
        }

        // Start
        connect();
    })();
    </script>
</body>
</html>
