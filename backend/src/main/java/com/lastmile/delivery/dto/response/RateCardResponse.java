package com.lastmile.delivery.dto.response;

import java.math.BigDecimal;

import com.lastmile.delivery.entity.OrderType;

public record RateCardResponse(

        Long id,

        Long pickupZoneId,

        String pickupZoneName,

        Long dropZoneId,

        String dropZoneName,

        OrderType orderType,

        BigDecimal ratePerKg,

        BigDecimal minimumCharge

) {
}
