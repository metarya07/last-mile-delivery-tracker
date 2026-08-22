package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.Size;

public record RescheduleOrderRequest(

        @Size(max = 50) String rescheduledDate,

        @Size(max = 255) String notes

) {
}
