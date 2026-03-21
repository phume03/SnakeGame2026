package com.snakegame.listener;

import com.snakegame.util.DatabaseManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

@WebListener
public class AppStartupListener implements ServletContextListener {

    private static final Logger log = LoggerFactory.getLogger(AppStartupListener.class);

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        log.info("Snake Game application starting...");
        // Initialize database eagerly
        DatabaseManager.getInstance();
        log.info("Snake Game application started successfully");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        log.info("Snake Game application shutting down...");
    }
}
