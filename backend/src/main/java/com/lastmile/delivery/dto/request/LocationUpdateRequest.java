package com.lastmile.delivery.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record LocationUpdateRequest(
        @NotNull(message = "Latitude is required")
        BigDecimal latitude,
        @NotNull(message = "Longitude is required")
        BigDecimal longitude
) {
}
