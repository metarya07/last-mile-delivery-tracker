package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "order_tracking_history") @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class OrderTrackingHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false) private DeliveryOrder order;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_id") private User actor;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void created() { createdAt = Instant.now(); }
}
