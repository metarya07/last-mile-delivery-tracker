package com.lastmile.delivery.dto.response;

import java.time.Instant;

import com.lastmile.delivery.entity.OrderStatus;

public record TrackingHistoryResponse(
        Long id,
        Long orderId,
        OrderStatus status,
        Long actorId,
        String actorName,
        Instant createdAt) {
}