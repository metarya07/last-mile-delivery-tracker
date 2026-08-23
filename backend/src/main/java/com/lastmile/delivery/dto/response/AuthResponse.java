package com.lastmile.delivery.dto.response;

import java.util.Set;
import com.lastmile.delivery.entity.Role;

public record AuthResponse(
        String token,
        Long id,
        String name,
        String email,
        Role role,
        Set<String> permissions) {

    public AuthResponse(String token, Long id, String name, String email, Role role) {
        this(token, id, name, email, role, null);
    }
}
