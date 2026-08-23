-- ============================================================
-- Last Mile Delivery Tracker
-- V5 - Add RBAC Roles, Scope Scaffolding & Audit Logs
-- ============================================================

-- 1. Extend user roles enum
ALTER TABLE users
    MODIFY COLUMN role ENUM(
        'CUSTOMER',
        'DELIVERY_AGENT',
        'ADMIN',
        'DISPATCHER',
        'WAREHOUSE_STAFF'
    ) NOT NULL;

-- 2. Add assigned_zone_id for warehouse staff scoping
ALTER TABLE users
    ADD COLUMN assigned_zone_id BIGINT NULL,
    ADD CONSTRAINT fk_user_assigned_zone
        FOREIGN KEY (assigned_zone_id)
        REFERENCES zones(id)
        ON DELETE SET NULL;

-- 3. Add current GPS coordinates and POD fields to orders
ALTER TABLE orders
    ADD COLUMN current_latitude DECIMAL(10, 7) NULL,
    ADD COLUMN current_longitude DECIMAL(10, 7) NULL,
    ADD COLUMN pod_url VARCHAR(500) NULL;

-- 4. Add POD fields to delivery_attempts
ALTER TABLE delivery_attempts
    ADD COLUMN pod_url VARCHAR(500) NULL,
    ADD COLUMN pod_signature VARCHAR(500) NULL,
    ADD COLUMN pod_notes VARCHAR(500) NULL,
    ADD COLUMN recipient_name VARCHAR(150) NULL;

-- 5. Create immutable audit_logs table
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    user_email VARCHAR(150),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NULL,
    ip_address VARCHAR(100) NULL,
    status ENUM('SUCCESS', 'DENIED', 'FAILED') NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_resource (resource, resource_id),
    INDEX idx_audit_created_at (created_at)
);
