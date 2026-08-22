package com.lastmile.delivery.dto.response;

import java.math.BigDecimal;

import com.lastmile.delivery.entity.OrderType;

public record CodChargeResponse(

        Long id,

        OrderType orderType,

        BigDecimal surcharge

) {
}
