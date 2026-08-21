package com.lastmile.delivery.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.lastmile.delivery.dto.request.LoginRequest;
import com.lastmile.delivery.dto.request.RegisterRequest;
import com.lastmile.delivery.dto.response.AuthResponse;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new IllegalArgumentException(
                    "Email is already registered");
        }

        User user = new User();

        user.setName(request.name());
        user.setEmail(
                request.email()
                        .trim()
                        .toLowerCase());
        user.setPassword(
                passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setRole(Role.CUSTOMER);

        return createResponse(
                userRepository.save(user));
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException(
                        "Invalid credentials"));

        if (!passwordEncoder.matches(
                request.password(),
                user.getPassword())) {
            throw new BadCredentialsException(
                    "Invalid credentials");
        }

        return createResponse(user);
    }

    public AuthResponse profile(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found"));

        return createResponse(user);
    }

    private AuthResponse createResponse(User user) {

        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(
                        "ROLE_" + user.getRole().name())
                .build();

        String token = jwtService.generateToken(
                userDetails,
                user.getRole().name());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole());
    }
}