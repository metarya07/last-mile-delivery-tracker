package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "cod_charges") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CodCharge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "order_type", nullable = false, unique = true) private OrderType orderType;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal surcharge;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void created() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void updated() { updatedAt = Instant.now(); }
}
