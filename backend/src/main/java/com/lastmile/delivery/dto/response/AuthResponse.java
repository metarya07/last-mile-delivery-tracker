package com.lastmile.delivery.dto.response;
import com.lastmile.delivery.entity.Role;
public record AuthResponse(String token, Long id, String name, String email, Role role) { }
