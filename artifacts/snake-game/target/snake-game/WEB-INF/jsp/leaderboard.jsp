<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="s" uri="/struts-tags" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leaderboard - Snake Arena</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
</head>
<body class="leaderboard-page">
    <div class="leaderboard-container">
        <header>
            <a href="${pageContext.request.contextPath}/index" class="btn btn-sm">← Back</a>
            <h1>🏆 Leaderboard</h1>
        </header>

        <!-- Search player -->
        <form action="${pageContext.request.contextPath}/leaderboard/player" method="get" class="search-form">
            <input type="text" name="playerName" placeholder="Search player..." value="${playerName}">
            <button type="submit" class="btn btn-primary">Search</button>
            <a href="${pageContext.request.contextPath}/leaderboard/top" class="btn btn-secondary">All Players</a>
        </form>

        <!-- Player history -->
        <c:if test="${not empty playerHistory}">
            <div class="section">
                <h2>Results for: ${playerName}</h2>
                <table class="leaderboard-table">
                    <thead>
                        <tr><th>#</th><th>Score</th><th>Level</th><th>Mode</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        <c:forEach var="e" items="${playerHistory}" varStatus="loop">
                            <tr>
                                <td>${loop.index + 1}</td>
                                <td class="score">${e.score}</td>
                                <td>${e.level}</td>
                                <td>${e.gameMode}</td>
                                <td>${e.playedAt}</td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>
            </div>
        </c:if>

        <!-- Top scores -->
        <div class="section">
            <h2>Top Scores — All Time</h2>
            <c:choose>
                <c:when test="${not empty topScores}">
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Player</th>
                                <th>Score</th>
                                <th>Level</th>
                                <th>Mode</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <c:forEach var="e" items="${topScores}" varStatus="loop">
                                <tr class="${loop.index == 0 ? 'gold' : loop.index == 1 ? 'silver' : loop.index == 2 ? 'bronze' : ''}">
                                    <td>
                                        <c:choose>
                                            <c:when test="${loop.index == 0}">🥇</c:when>
                                            <c:when test="${loop.index == 1}">🥈</c:when>
                                            <c:when test="${loop.index == 2}">🥉</c:when>
                                            <c:otherwise>${loop.index + 1}</c:otherwise>
                                        </c:choose>
                                    </td>
                                    <td>${e.playerName}</td>
                                    <td class="score">${e.score}</td>
                                    <td>${e.level}</td>
                                    <td>${e.gameMode}</td>
                                    <td>${e.playedAt}</td>
                                </tr>
                            </c:forEach>
                        </tbody>
                    </table>
                </c:when>
                <c:otherwise>
                    <p class="no-scores">No scores yet. Play a game to appear here!</p>
                    <a href="${pageContext.request.contextPath}/index" class="btn btn-primary">Play Now</a>
                </c:otherwise>
            </c:choose>
        </div>

        <!-- Recent matches -->
        <c:if test="${not empty recentMatches}">
            <div class="section">
                <h2>Recent Matches</h2>
                <table class="leaderboard-table">
                    <thead>
                        <tr><th>World</th><th>Players</th><th>Winner</th><th>Mode</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        <c:forEach var="m" items="${recentMatches}">
                            <tr>
                                <td>${m.worldId}</td>
                                <td>
                                    <c:forEach var="p" items="${m.playerNames}" varStatus="loop">
                                        ${p}<c:if test="${!loop.last}">, </c:if>
                                    </c:forEach>
                                </td>
                                <td class="winner">${m.winnerName != null ? m.winnerName : '-'}</td>
                                <td>${m.gameMode}</td>
                                <td>${m.playedAt}</td>
                            </tr>
                        </c:forEach>
                    </tbody>
                </table>
            </div>
        </c:if>
    </div>
</body>
</html>
