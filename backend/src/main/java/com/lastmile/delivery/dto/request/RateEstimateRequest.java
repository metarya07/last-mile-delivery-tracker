package com.lastmile.delivery.dto.request;

import java.math.BigDecimal;

import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.PaymentType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record RateEstimateRequest(

        @NotNull Long pickupZoneId,

        @NotNull Long dropZoneId,

        @NotNull @DecimalMin("0.01") BigDecimal lengthCm,

        @NotNull @DecimalMin("0.01") BigDecimal widthCm,

        @NotNull @DecimalMin("0.01") BigDecimal heightCm,

        @NotNull @DecimalMin("0.001") BigDecimal actualWeightKg,

        @NotNull OrderType orderType,

        @NotNull PaymentType paymentType

) {
}
