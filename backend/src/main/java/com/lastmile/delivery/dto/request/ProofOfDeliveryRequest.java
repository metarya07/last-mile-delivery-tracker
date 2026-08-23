package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ProofOfDeliveryRequest(
        @NotBlank(message = "Proof of delivery image URL is required")
        String podUrl,
        String signatureUrl,
        String recipientName,
        String notes
) {
}
