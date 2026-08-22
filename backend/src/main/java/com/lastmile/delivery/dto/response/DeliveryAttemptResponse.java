package com.lastmile.delivery.dto.response;

import java.time.Instant;

import com.lastmile.delivery.entity.AttemptStatus;

public record DeliveryAttemptResponse(
        Long id,
        Long orderId,
        Long deliveryAgentId,
        String deliveryAgentName,
        int attemptNumber,
        AttemptStatus status,
        String failureReason,
        Instant attemptedAt) {
}