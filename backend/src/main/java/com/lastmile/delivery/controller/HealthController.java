package com.lastmile.delivery.controller;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final Instant startTime = Instant.now();

    /**
     * Uptime / Heartbeat endpoint for pingers like UptimeRobot, Render, and Cron monitors.
     */
    @RequestMapping(
            value = {"/api/health", "/health", "/"},
            method = {RequestMethod.GET, RequestMethod.HEAD}
    )
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "last-mile-delivery-backend",
                "uptimeSeconds", java.time.Duration.between(startTime, Instant.now()).getSeconds(),
                "timestamp", Instant.now().toString()
        ));
    }
}
