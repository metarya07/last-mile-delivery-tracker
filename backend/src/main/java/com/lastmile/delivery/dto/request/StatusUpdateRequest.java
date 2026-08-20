package com.lastmile.delivery.dto.request;
import com.lastmile.delivery.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;
public record StatusUpdateRequest(@NotNull OrderStatus status, String failureReason) { }
