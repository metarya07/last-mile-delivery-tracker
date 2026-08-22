package com.lastmile.delivery.dto.response;

import java.math.BigDecimal;

import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.PaymentType;

public record RateEstimateResponse(

        BigDecimal actualWeightKg,

        BigDecimal volumetricWeightKg,

        BigDecimal chargeableWeightKg,

        BigDecimal ratePerKg,

        BigDecimal minimumCharge,

        BigDecimal baseCharge,

        BigDecimal codSurcharge,

        BigDecimal finalCharge,

        String pickupZoneName,

        String dropZoneName,

        OrderType orderType,

        PaymentType paymentType

) {
}
