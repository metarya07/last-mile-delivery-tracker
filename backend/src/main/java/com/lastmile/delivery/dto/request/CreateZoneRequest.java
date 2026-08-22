package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateZoneRequest(

        @NotBlank @Size(max = 100) String name

) {
}
