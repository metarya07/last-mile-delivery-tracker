package com.lastmile.delivery.dto.response;

import com.lastmile.delivery.entity.Role;

public record UserResponse(
        Long id,
        String name,
        String email,
        String phone,
        Role role,
        boolean available) {
}