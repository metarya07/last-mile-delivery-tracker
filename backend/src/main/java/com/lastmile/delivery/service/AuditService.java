package com.lastmile.delivery.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.lastmile.delivery.entity.AuditLog;
import com.lastmile.delivery.repository.AuditLogRepository;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            Long userId,
            String userEmail,
            String userRole,
            String action,
            String resource,
            String resourceId,
            String status,
            String details,
            String ipAddress) {

        try {
            AuditLog log = new AuditLog();
            log.setUserId(userId);
            log.setUserEmail(userEmail);
            log.setUserRole(userRole);
            log.setAction(action);
            log.setResource(resource);
            log.setResourceId(resourceId);
            log.setStatus(status);
            log.setDetails(details);
            log.setIpAddress(ipAddress);

            auditLogRepository.save(log);
        } catch (Exception ex) {
            System.err.println("Failed to persist security audit log: " + ex.getMessage());
        }
    }

    public void logSuccess(
            Long userId,
            String userEmail,
            String userRole,
            String action,
            String resource,
            String resourceId,
            String details) {
        log(userId, userEmail, userRole, action, resource, resourceId, "SUCCESS", details, null);
    }

    public void logDenied(
            Long userId,
            String userEmail,
            String userRole,
            String action,
            String resource,
            String resourceId,
            String details) {
        log(userId, userEmail, userRole, action, resource, resourceId, "DENIED", details, null);
    }

    public void logFailure(
            Long userId,
            String userEmail,
            String userRole,
            String action,
            String resource,
            String resourceId,
            String details) {
        log(userId, userEmail, userRole, action, resource, resourceId, "FAILED", details, null);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByAction(String action) {
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action);
    }
}
