<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="s" uri="/struts-tags" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multiplayer Snake Game</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
</head>
<body class="home-page">
    <div class="home-container">
        <header>
            <div class="logo">🐍</div>
            <h1>SNAKE ARENA</h1>
            <p class="tagline">Classic Snake. Multiplayer Mayhem. 10 Brutal Levels.</p>
        </header>

        <div class="menu-cards">
            <!-- Single Player -->
            <div class="menu-card" onclick="showJoinForm('single')">
                <div class="card-icon">🎮</div>
                <h2>Single Player</h2>
                <p>Battle the AI system snake through 10 increasingly difficult levels</p>
                <ul class="feature-list">
                    <li>✓ 10 unique levels</li>
                    <li>✓ AI opponent snake</li>
                    <li>✓ Warp mechanic (double-tap)</li>
                    <li>✓ Up to 5 colored apples</li>
                </ul>
            </div>

            <!-- Multiplayer -->
            <div class="menu-card" onclick="showJoinForm('multi')">
                <div class="card-icon">👥</div>
                <h2>Multiplayer</h2>
                <p>Up to 3 players per arena. Last snake standing wins!</p>
                <ul class="feature-list">
                    <li>✓ Up to 3 players per world</li>
                    <li>✓ Auto-matchmaking</li>
                    <li>✓ 10 multiplayer levels</li>
                    <li>✓ Real-time WebSocket</li>
                </ul>
                <div class="active-worlds">
                    <span class="world-count">${activeWorlds}</span> active worlds
                </div>
            </div>
        </div>

        <!-- Name entry forms -->
        <div id="joinForm" class="join-form" style="display:none;">
            <h3 id="joinTitle">Enter Your Name</h3>
            <input type="text" id="playerNameInput" placeholder="Your name..." maxlength="20" autofocus>
            <div class="form-buttons">
                <button id="joinBtn" class="btn btn-primary">Join Game</button>
                <button onclick="hideJoinForm()" class="btn btn-secondary">Cancel</button>
            </div>
        </div>

        <!-- Leaderboard -->
        <div class="leaderboard-preview">
            <h3>🏆 Top Scores</h3>
            <c:choose>
                <c:when test="${not empty topScores}">
                    <table class="leaderboard-table">
                        <thead>
                            <tr><th>#</th><th>Player</th><th>Score</th><th>Level</th><th>Mode</th></tr>
                        </thead>
                        <tbody>
                            <c:forEach var="entry" items="${topScores}" varStatus="loop">
                                <tr>
                                    <td>${loop.index + 1}</td>
                                    <td>${entry.playerName}</td>
                                    <td class="score">${entry.score}</td>
                                    <td>${entry.level}</td>
                                    <td>${entry.gameMode}</td>
                                </tr>
                            </c:forEach>
                        </tbody>
                    </table>
                </c:when>
                <c:otherwise>
                    <p class="no-scores">No scores yet. Be the first to play!</p>
                </c:otherwise>
            </c:choose>
            <a href="${pageContext.request.contextPath}/leaderboard/top" class="btn btn-link">Full Leaderboard →</a>
        </div>

        <!-- Controls Reference -->
        <div class="controls-info">
            <h3>Controls</h3>
            <div class="controls-grid">
                <div class="control-item">
                    <kbd>↑ ↓ ← →</kbd>
                    <span>Move Snake</span>
                </div>
                <div class="control-item">
                    <kbd>↑↑</kbd> <kbd>↓↓</kbd> <kbd>←←</kbd> <kbd>→→</kbd>
                    <span>Double-tap = Warp 1-2 spaces</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        var selectedMode = null;

        function showJoinForm(mode) {
            selectedMode = mode;
            document.getElementById('joinTitle').textContent =
                mode === 'single' ? 'Enter Your Name — Single Player' : 'Enter Your Name — Multiplayer';
            document.getElementById('joinForm').style.display = 'block';
            document.getElementById('playerNameInput').focus();
        }

        function hideJoinForm() {
            document.getElementById('joinForm').style.display = 'none';
            selectedMode = null;
        }

        document.getElementById('joinBtn').addEventListener('click', function() {
            var name = document.getElementById('playerNameInput').value.trim();
            if (!name) { alert('Please enter your name'); return; }
            var ctx = '${pageContext.request.contextPath}';
            if (selectedMode === 'single') {
                window.location.href = ctx + '/game/single?playerName=' + encodeURIComponent(name);
            } else {
                window.location.href = ctx + '/game/multi?playerName=' + encodeURIComponent(name);
            }
        });

        document.getElementById('playerNameInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('joinBtn').click();
        });
    </script>
</body>
</html>
