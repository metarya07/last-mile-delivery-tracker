package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.entity.AuditLog;
import com.lastmile.delivery.service.AuditService;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("@rbac.hasPermission('AUDIT_LOG_VIEW')")
    public List<AuditLog> getRecentAuditLogs() {
        return auditService.getRecentLogs();
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("@rbac.hasPermission('AUDIT_LOG_VIEW')")
    public List<AuditLog> getAuditLogsByUser(@PathVariable Long userId) {
        return auditService.getLogsByUser(userId);
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("@rbac.hasPermission('AUDIT_LOG_VIEW')")
    public List<AuditLog> getAuditLogsByAction(@PathVariable String action) {
        return auditService.getLogsByAction(action);
    }
}
