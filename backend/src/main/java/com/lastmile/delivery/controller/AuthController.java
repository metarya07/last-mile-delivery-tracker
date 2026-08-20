package com.lastmile.delivery.controller;

import com.lastmile.delivery.dto.request.*;
import com.lastmile.delivery.dto.response.AuthResponse;
import com.lastmile.delivery.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public AuthResponse register(@Valid @RequestBody RegisterRequest request) { return auth.register(request); }
    @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }
    @GetMapping("/profile") public AuthResponse profile(Authentication authentication) { return auth.profile(authentication.getName()); }
}
