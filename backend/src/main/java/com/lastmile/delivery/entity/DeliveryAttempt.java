package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "delivery_attempts", uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "attempt_number"})) @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DeliveryAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false) private DeliveryOrder order;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "delivery_agent_id") private User deliveryAgent;
    @Column(name = "attempt_number", nullable = false) private int attemptNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AttemptStatus status;
    @Column(name = "failure_reason", length = 500) private String failureReason;
    @Column(name = "attempted_at", nullable = false, updatable = false) private Instant attemptedAt;
    @PrePersist void created() { attemptedAt = Instant.now(); }
}
