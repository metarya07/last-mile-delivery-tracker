package com.lastmile.delivery.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.PaymentType;

public record OrderResponse(
        Long id,
        Long customerId,
        Long deliveryAgentId,
        String pickupAddress,
        String dropAddress,
        String pickupZone,
        String dropZone,
        OrderType orderType,
        PaymentType paymentType,
        OrderStatus status,
        BigDecimal chargeableWeightKg,
        BigDecimal finalCharge,
        Instant createdAt) {
}