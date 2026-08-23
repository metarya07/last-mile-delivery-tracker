-- ============================================================
-- Last Mile Delivery Tracker
-- V7 - Seed Default Demo Accounts for All 5 RBAC Roles
-- ============================================================

INSERT INTO users (name, email, password, role, phone, is_available, assigned_zone_id) VALUES
('System Administrator', 'admin@lastmile.com', '$2a$10$fThwIu0365Bv7HRynOVTJeeKiDjtBwfmLSejLX7wtp4fT.haZegGK', 'ADMIN', '+91 98765 00001', 0, NULL),
('Fleet Dispatcher', 'dispatcher@lastmile.com', '$2a$10$fThwIu0365Bv7HRynOVTJeeKiDjtBwfmLSejLX7wtp4fT.haZegGK', 'DISPATCHER', '+91 98765 00002', 0, NULL),
('Rajesh Kumar (Driver)', 'agent@lastmile.com', '$2a$10$fThwIu0365Bv7HRynOVTJeeKiDjtBwfmLSejLX7wtp4fT.haZegGK', 'DELIVERY_AGENT', '+91 98765 00003', 1, NULL),
('North Hub Warehouse', 'warehouse@lastmile.com', '$2a$10$fThwIu0365Bv7HRynOVTJeeKiDjtBwfmLSejLX7wtp4fT.haZegGK', 'WAREHOUSE_STAFF', '+91 98765 00004', 0, 1),
('Acme Retail Corp', 'customer@lastmile.com', '$2a$10$fThwIu0365Bv7HRynOVTJeeKiDjtBwfmLSejLX7wtp4fT.haZegGK', 'CUSTOMER', '+91 98765 00005', 0, NULL)
ON DUPLICATE KEY UPDATE
    name=VALUES(name),
    password=VALUES(password),
    role=VALUES(role),
    phone=VALUES(phone),
    is_available=VALUES(is_available),
    assigned_zone_id=VALUES(assigned_zone_id);
