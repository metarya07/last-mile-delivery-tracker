-- ============================================================
-- Last Mile Delivery Tracker
-- V6 - Seed Default Operational Zones, Areas, Rate Cards & COD Surcharges
-- ============================================================

-- 1. Insert Default Zones
INSERT INTO zones (id, name) VALUES
(1, 'North Zone'),
(2, 'South Zone'),
(3, 'East Zone'),
(4, 'West Zone')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Insert Default Coverage Areas
INSERT IGNORE INTO zone_areas (zone_id, area_name) VALUES
(1, 'Connaught Place'),
(1, 'Karol Bagh'),
(1, 'Rohini'),
(1, 'Civil Lines'),
(1, 'Pitampura'),
(2, 'Hauz Khas'),
(2, 'Saket'),
(2, 'Greater Kailash'),
(2, 'Vasant Kunj'),
(2, 'Nehru Place'),
(3, 'Laxmi Nagar'),
(3, 'Mayur Vihar'),
(3, 'Preet Vihar'),
(3, 'Anand Vihar'),
(3, 'Patparganj'),
(4, 'Janakpuri'),
(4, 'Dwarka'),
(4, 'Rajouri Garden'),
(4, 'Punjabi Bagh'),
(4, 'Paschim Vihar');

-- 3. Insert Default COD Surcharges
INSERT INTO cod_charges (order_type, surcharge) VALUES
('B2C', 25.00),
('B2B', 40.00)
ON DUPLICATE KEY UPDATE surcharge=VALUES(surcharge);

-- 4. Insert Default Rate Cards for All Zone Combinations (B2C & B2B)
INSERT INTO rate_cards (pickup_zone_id, drop_zone_id, order_type, rate_per_kg, minimum_charge) VALUES
-- North Zone Routes
(1, 1, 'B2C', 40.00, 50.00),
(1, 1, 'B2B', 30.00, 70.00),
(1, 2, 'B2C', 55.00, 80.00),
(1, 2, 'B2B', 45.00, 100.00),
(1, 3, 'B2C', 55.00, 80.00),
(1, 3, 'B2B', 45.00, 100.00),
(1, 4, 'B2C', 55.00, 80.00),
(1, 4, 'B2B', 45.00, 100.00),

-- South Zone Routes
(2, 1, 'B2C', 55.00, 80.00),
(2, 1, 'B2B', 45.00, 100.00),
(2, 2, 'B2C', 40.00, 50.00),
(2, 2, 'B2B', 30.00, 70.00),
(2, 3, 'B2C', 55.00, 80.00),
(2, 3, 'B2B', 45.00, 100.00),
(2, 4, 'B2C', 55.00, 80.00),
(2, 4, 'B2B', 45.00, 100.00),

-- East Zone Routes
(3, 1, 'B2C', 55.00, 80.00),
(3, 1, 'B2B', 45.00, 100.00),
(3, 2, 'B2C', 55.00, 80.00),
(3, 2, 'B2B', 45.00, 100.00),
(3, 3, 'B2C', 40.00, 50.00),
(3, 3, 'B2B', 30.00, 70.00),
(3, 4, 'B2C', 55.00, 80.00),
(3, 4, 'B2B', 45.00, 100.00),

-- West Zone Routes
(4, 1, 'B2C', 55.00, 80.00),
(4, 1, 'B2B', 45.00, 100.00),
(4, 2, 'B2C', 55.00, 80.00),
(4, 2, 'B2B', 45.00, 100.00),
(4, 3, 'B2C', 55.00, 80.00),
(4, 3, 'B2B', 45.00, 100.00),
(4, 4, 'B2C', 40.00, 50.00),
(4, 4, 'B2B', 30.00, 70.00)
ON DUPLICATE KEY UPDATE
    rate_per_kg=VALUES(rate_per_kg),
    minimum_charge=VALUES(minimum_charge);
