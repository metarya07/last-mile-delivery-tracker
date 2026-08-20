package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "orders") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DeliveryOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "customer_id", nullable = false) private User customer;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "delivery_agent_id") private User deliveryAgent;
    @Column(name = "pickup_address", nullable = false, length = 500) private String pickupAddress;
    @Column(name = "drop_address", nullable = false, length = 500) private String dropAddress;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "pickup_zone_id", nullable = false) private Zone pickupZone;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "drop_zone_id", nullable = false) private Zone dropZone;
    @Column(name = "length_cm", nullable = false, precision = 10, scale = 2) private BigDecimal lengthCm;
    @Column(name = "width_cm", nullable = false, precision = 10, scale = 2) private BigDecimal widthCm;
    @Column(name = "height_cm", nullable = false, precision = 10, scale = 2) private BigDecimal heightCm;
    @Column(name = "actual_weight_kg", nullable = false, precision = 10, scale = 3) private BigDecimal actualWeightKg;
    @Column(name = "volumetric_weight_kg", nullable = false, precision = 10, scale = 3) private BigDecimal volumetricWeightKg;
    @Column(name = "chargeable_weight_kg", nullable = false, precision = 10, scale = 3) private BigDecimal chargeableWeightKg;
    @Enumerated(EnumType.STRING) @Column(name = "order_type", nullable = false) private OrderType orderType;
    @Enumerated(EnumType.STRING) @Column(name = "payment_type", nullable = false) private PaymentType paymentType;
    @Column(name = "base_charge", nullable = false, precision = 10, scale = 2) private BigDecimal baseCharge;
    @Column(name = "cod_surcharge", nullable = false, precision = 10, scale = 2) private BigDecimal codSurcharge;
    @Column(name = "final_charge", nullable = false, precision = 10, scale = 2) private BigDecimal finalCharge;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void created() { createdAt = updatedAt = Instant.now(); if (status == null) status = OrderStatus.PLACED; }
    @PreUpdate void updated() { updatedAt = Instant.now(); }
}
