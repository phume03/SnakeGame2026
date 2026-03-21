package com.snakegame.util;

import com.snakegame.model.LeaderboardEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * H2 in-memory database for leaderboard persistence during a server session.
 * Uses singleton pattern for connection pool.
 */
public class DatabaseManager {

    private static final Logger log = LoggerFactory.getLogger(DatabaseManager.class);
    private static volatile DatabaseManager instance;
    private Connection connection;

    private DatabaseManager() {
        try {
            Class.forName("org.h2.Driver");
            connection = DriverManager.getConnection(
                "jdbc:h2:mem:snakegame;DB_CLOSE_DELAY=-1", "sa", "");
            initSchema();
        } catch (Exception e) {
            log.error("Failed to initialize database", e);
        }
    }

    public static DatabaseManager getInstance() {
        if (instance == null) {
            synchronized (DatabaseManager.class) {
                if (instance == null) instance = new DatabaseManager();
            }
        }
        return instance;
    }

    private void initSchema() throws SQLException {
        String sql = "CREATE TABLE IF NOT EXISTS leaderboard (" +
                     "  id INT AUTO_INCREMENT PRIMARY KEY," +
                     "  player_name VARCHAR(100) NOT NULL," +
                     "  score INT NOT NULL," +
                     "  level INT NOT NULL," +
                     "  game_mode VARCHAR(20) NOT NULL," +
                     "  played_at VARCHAR(30) NOT NULL" +
                     ")";
        try (Statement stmt = connection.createStatement()) {
            stmt.execute(sql);
        }
        log.info("Database schema initialized");
    }

    public synchronized void saveScore(String playerName, int score, int level, String gameMode) {
        String now = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
        String sql = "INSERT INTO leaderboard(player_name, score, level, game_mode, played_at) VALUES(?,?,?,?,?)";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, playerName);
            ps.setInt(2, score);
            ps.setInt(3, level);
            ps.setString(4, gameMode);
            ps.setString(5, now);
            ps.executeUpdate();
            log.debug("Saved score for {}: {} pts level {}", playerName, score, level);
        } catch (SQLException e) {
            log.error("Failed to save score", e);
        }
    }

    public synchronized List<LeaderboardEntry> getTopScores(int limit) {
        List<LeaderboardEntry> list = new ArrayList<>();
        String sql = "SELECT player_name, score, level, game_mode, played_at " +
                     "FROM leaderboard ORDER BY score DESC LIMIT ?";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(new LeaderboardEntry(
                    rs.getString("player_name"),
                    rs.getInt("score"),
                    rs.getInt("level"),
                    rs.getString("game_mode"),
                    rs.getString("played_at")
                ));
            }
        } catch (SQLException e) {
            log.error("Failed to fetch leaderboard", e);
        }
        return list;
    }

    public synchronized List<LeaderboardEntry> getPlayerScores(String playerName) {
        List<LeaderboardEntry> list = new ArrayList<>();
        String sql = "SELECT player_name, score, level, game_mode, played_at " +
                     "FROM leaderboard WHERE player_name=? ORDER BY score DESC";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, playerName);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(new LeaderboardEntry(
                    rs.getString("player_name"),
                    rs.getInt("score"),
                    rs.getInt("level"),
                    rs.getString("game_mode"),
                    rs.getString("played_at")
                ));
            }
        } catch (SQLException e) {
            log.error("Failed to fetch player scores", e);
        }
        return list;
    }
}
