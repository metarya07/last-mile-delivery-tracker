package com.lastmile.delivery.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.ForgotPasswordRequest;
import com.lastmile.delivery.dto.request.LoginRequest;
import com.lastmile.delivery.dto.request.RegisterRequest;
import com.lastmile.delivery.dto.request.ResetPasswordRequest;
import com.lastmile.delivery.dto.request.VerifyOtpRequest;
import com.lastmile.delivery.dto.response.AuthResponse;
import com.lastmile.delivery.service.AuthService;
import com.lastmile.delivery.service.PasswordResetService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(
            AuthService authService,
            PasswordResetService passwordResetService) {

        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request) {

        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request) {

        return authService.login(request);
    }

    @GetMapping("/profile")
    public AuthResponse profile(
            Authentication authentication) {

        return authService.profile(
                authentication.getName());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public void forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        passwordResetService.requestPasswordReset(
                request.email());
    }

    @PostMapping("/verify-otp")
    @ResponseStatus(HttpStatus.OK)
    public void verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        passwordResetService.verifyOtp(
                request.email(),
                request.otp());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public void resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        passwordResetService.resetPassword(
                request.email(),
                request.otp(),
                request.newPassword());
    }
}