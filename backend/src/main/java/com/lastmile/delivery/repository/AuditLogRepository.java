package com.lastmile.delivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.lastmile.delivery.entity.AuditLog;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findTop100ByOrderByCreatedAtDesc();

    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);

    List<AuditLog> findByResourceAndResourceIdOrderByCreatedAtDesc(String resource, String resourceId);
}
