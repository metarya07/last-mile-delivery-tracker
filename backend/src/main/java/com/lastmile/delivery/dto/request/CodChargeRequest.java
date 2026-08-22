package com.lastmile.delivery.dto.request;

import java.math.BigDecimal;

import com.lastmile.delivery.entity.OrderType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CodChargeRequest(

        @NotNull OrderType orderType,

        @NotNull @DecimalMin("0.00") BigDecimal surcharge

) {
}
