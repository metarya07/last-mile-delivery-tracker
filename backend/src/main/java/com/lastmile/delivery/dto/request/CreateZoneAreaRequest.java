package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateZoneAreaRequest(

        @NotBlank @Size(max = 150) String areaName

) {
}
