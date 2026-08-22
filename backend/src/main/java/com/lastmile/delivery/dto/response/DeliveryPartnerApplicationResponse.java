package com.lastmile.delivery.dto.response;

import java.time.Instant;

import com.lastmile.delivery.entity.ApplicationStatus;

public record DeliveryPartnerApplicationResponse(
        Long id,
        Long applicantId,
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        String vehicleType,
        String vehicleNumber,
        String drivingLicense,
        String preferredArea,
        ApplicationStatus status,
        String rejectionReason,
        Instant createdAt,
        Instant reviewedAt,
        Long reviewedById,
        String reviewedByName) {
}
