package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "rate_cards", uniqueConstraints = @UniqueConstraint(columnNames = {"pickup_zone_id", "drop_zone_id", "order_type"})) @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RateCard {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "pickup_zone_id", nullable = false) private Zone pickupZone;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "drop_zone_id", nullable = false) private Zone dropZone;
    @Enumerated(EnumType.STRING) @Column(name = "order_type", nullable = false) private OrderType orderType;
    @Column(name = "rate_per_kg", nullable = false, precision = 10, scale = 2) private BigDecimal ratePerKg;
    @Column(name = "minimum_charge", nullable = false, precision = 10, scale = 2) private BigDecimal minimumCharge;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void created() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updated() { updatedAt = Instant.now(); }
}
