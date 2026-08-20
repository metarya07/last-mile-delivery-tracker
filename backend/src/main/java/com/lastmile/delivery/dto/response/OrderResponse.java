package com.lastmile.delivery.dto.response;
import com.lastmile.delivery.entity.*;
import java.math.BigDecimal;
import java.time.Instant;
public record OrderResponse(Long id, Long customerId, Long deliveryAgentId, String pickupAddress, String dropAddress, String pickupZone, String dropZone, OrderType orderType, PaymentType paymentType, OrderStatus status, BigDecimal chargeableWeightKg, BigDecimal finalCharge, Instant createdAt) { }
