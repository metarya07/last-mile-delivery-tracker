package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryPartnerApplicationRequest(

        @NotBlank(message = "Vehicle type is required")
        @Size(max = 50, message = "Vehicle type must not exceed 50 characters")
        String vehicleType,

        @Size(max = 50, message = "Vehicle number must not exceed 50 characters")
        String vehicleNumber,

        @NotBlank(message = "Driving license number is required")
        @Size(max = 100, message = "Driving license must not exceed 100 characters")
        String drivingLicense,

        @Size(max = 150, message = "Preferred area must not exceed 150 characters")
        String preferredArea

) {
}
