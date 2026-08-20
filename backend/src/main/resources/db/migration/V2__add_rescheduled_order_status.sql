ALTER TABLE orders
    MODIFY COLUMN status ENUM(
        'PLACED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED',
        'RESCHEDULED'
    ) NOT NULL DEFAULT 'PLACED';

ALTER TABLE order_tracking_history
    MODIFY COLUMN status ENUM(
        'PLACED',
        'PICKED_UP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED',
        'RESCHEDULED'
    ) NOT NULL;
