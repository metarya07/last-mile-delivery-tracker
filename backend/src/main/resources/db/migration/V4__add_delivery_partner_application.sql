-- ============================================================
-- Last Mile Delivery Tracker
-- V4 - Add Delivery Partner Applications Table
-- ============================================================

CREATE TABLE delivery_partner_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT NOT NULL,

    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(50),
    driving_license VARCHAR(100) NOT NULL,
    preferred_area VARCHAR(150),

    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',

    rejection_reason VARCHAR(500),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by BIGINT NULL,

    CONSTRAINT fk_application_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_application_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);
