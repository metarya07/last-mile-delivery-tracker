package com.lastmile.delivery.dto.request;
import com.lastmile.delivery.entity.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record CreateOrderRequest(@NotBlank @Size(max=500) String pickupAddress, @NotBlank @Size(max=500) String dropAddress, @NotNull Long pickupZoneId, @NotNull Long dropZoneId, @NotNull @DecimalMin("0.01") BigDecimal lengthCm, @NotNull @DecimalMin("0.01") BigDecimal widthCm, @NotNull @DecimalMin("0.01") BigDecimal heightCm, @NotNull @DecimalMin("0.001") BigDecimal actualWeightKg, @NotNull OrderType orderType, @NotNull PaymentType paymentType) { }
