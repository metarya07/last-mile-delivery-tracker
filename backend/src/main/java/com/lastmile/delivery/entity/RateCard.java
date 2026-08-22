package com.lastmile.delivery.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "rate_cards", uniqueConstraints = @UniqueConstraint(columnNames = {
        "pickup_zone_id",
        "drop_zone_id",
        "order_type"
}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RateCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_zone_id", nullable = false)
    private Zone pickupZone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drop_zone_id", nullable = false)
    private Zone dropZone;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false)
    private OrderType orderType;

    @Column(name = "rate_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerKg;

    @Column(name = "minimum_charge", nullable = false, precision = 10, scale = 2)
    private BigDecimal minimumCharge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}