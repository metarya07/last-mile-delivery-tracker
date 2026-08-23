package com.lastmile.delivery.entity;

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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "delivery_attempts", uniqueConstraints = @UniqueConstraint(columnNames = { "order_id",
        "attempt_number" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private DeliveryOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_agent_id")
    private User deliveryAgent;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttemptStatus status;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "pod_url", length = 500)
    private String podUrl;

    @Column(name = "pod_signature", length = 500)
    private String podSignature;

    @Column(name = "pod_notes", length = 500)
    private String podNotes;

    @Column(name = "recipient_name", length = 150)
    private String recipientName;

    @Column(name = "attempted_at", nullable = false, updatable = false)
    private Instant attemptedAt;

    @PrePersist
    protected void onCreate() {
        attemptedAt = Instant.now();
    }
}