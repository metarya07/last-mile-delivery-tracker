package com.lastmile.delivery.dto.request;

import com.lastmile.delivery.entity.Role;

import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull(message = "Role is required")
        Role role,
        Long assignedZoneId
) {
}
