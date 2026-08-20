-- ============================================================
-- Last Mile Delivery Tracker
-- V1 - Initial Database Schema
-- ============================================================

-- -------------------------
-- USERS
-- -------------------------
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('CUSTOMER', 'DELIVERY_AGENT', 'ADMIN') NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------
-- ZONES
-- -------------------------
CREATE TABLE zones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------
-- ZONE AREAS
-- -------------------------
CREATE TABLE zone_areas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone_id BIGINT NOT NULL,
    area_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_zone_areas_zone
        FOREIGN KEY (zone_id)
        REFERENCES zones(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_zone_area
        UNIQUE (zone_id, area_name)
);

-- -------------------------
-- RATE CARDS
-- -------------------------
CREATE TABLE rate_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    pickup_zone_id BIGINT NOT NULL,
    drop_zone_id BIGINT NOT NULL,

    order_type ENUM('B2B', 'B2C') NOT NULL,

    rate_per_kg DECIMAL(10, 2) NOT NULL,
    minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rate_pickup_zone
        FOREIGN KEY (pickup_zone_id)
        REFERENCES zones(id),

    CONSTRAINT fk_rate_drop_zone
        FOREIGN KEY (drop_zone_id)
        REFERENCES zones(id),

    CONSTRAINT uk_rate_card
        UNIQUE (pickup_zone_id, drop_zone_id, order_type)
);

-- -------------------------
-- COD CHARGES
-- -------------------------
CREATE TABLE cod_charges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    order_type ENUM('B2B', 'B2C') NOT NULL UNIQUE,

    surcharge DECIMAL(10, 2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------
-- ORDERS
-- -------------------------
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    customer_id BIGINT NOT NULL,
    delivery_agent_id BIGINT NULL,

    pickup_address VARCHAR(500) NOT NULL,
    drop_address VARCHAR(500) NOT NULL,

    pickup_zone_id BIGINT NOT NULL,
    drop_zone_id BIGINT NOT NULL,

    length_cm DECIMAL(10, 2) NOT NULL,
    width_cm DECIMAL(10, 2) NOT NULL,
    height_cm DECIMAL(10, 2) NOT NULL,

    actual_weight_kg DECIMAL(10, 3) NOT NULL,
    volumetric_weight_kg DECIMAL(10, 3) NOT NULL,
    chargeable_weight_kg DECIMAL(10, 3) NOT NULL,

    order_type ENUM('B2B', 'B2C') NOT NULL,
    payment_type ENUM('PREPAID', 'COD') NOT NULL,

    base_charge DECIMAL(10, 2) NOT NULL,
    cod_surcharge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    final_charge DECIMAL(10, 2) NOT NULL,

    status ENUM(
        'PLACED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED'
    ) NOT NULL DEFAULT 'PLACED',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(id),

    CONSTRAINT fk_order_agent
        FOREIGN KEY (delivery_agent_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_order_pickup_zone
        FOREIGN KEY (pickup_zone_id)
        REFERENCES zones(id),

    CONSTRAINT fk_order_drop_zone
        FOREIGN KEY (drop_zone_id)
        REFERENCES zones(id)
);

-- -------------------------
-- ORDER TRACKING HISTORY
-- -------------------------
CREATE TABLE order_tracking_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT NOT NULL,

    status ENUM(
        'PLACED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED'
    ) NOT NULL,

    actor_id BIGINT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tracking_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tracking_actor
        FOREIGN KEY (actor_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- -------------------------
-- DELIVERY ATTEMPTS
-- -------------------------
CREATE TABLE delivery_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT NOT NULL,
    delivery_agent_id BIGINT NULL,

    attempt_number INT NOT NULL,

    status ENUM('FAILED', 'RESCHEDULED', 'DELIVERED') NOT NULL,

    failure_reason VARCHAR(500),

    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attempt_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attempt_agent
        FOREIGN KEY (delivery_agent_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT uk_delivery_attempt
        UNIQUE (order_id, attempt_number)
);