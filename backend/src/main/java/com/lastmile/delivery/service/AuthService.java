package com.lastmile.delivery.service;

import com.lastmile.delivery.dto.request.*;
import com.lastmile.delivery.dto.response.AuthResponse;
import com.lastmile.delivery.entity.*;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users; private final PasswordEncoder passwords; private final JwtService jwt;
    public AuthService(UserRepository users, PasswordEncoder passwords, JwtService jwt) { this.users = users; this.passwords = passwords; this.jwt = jwt; }
    public AuthResponse register(RegisterRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new IllegalArgumentException("Email is already registered");
        User user = new User(); user.setName(request.name()); user.setEmail(request.email().trim().toLowerCase()); user.setPassword(passwords.encode(request.password())); user.setPhone(request.phone()); user.setRole(Role.CUSTOMER);
        return response(users.save(user));
    }
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email()).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwords.matches(request.password(), user.getPassword())) throw new BadCredentialsException("Invalid credentials");
        return response(user);
    }
    public AuthResponse profile(String email) { return response(users.findByEmailIgnoreCase(email).orElseThrow()); }
    private AuthResponse response(User user) {
        UserDetails details = org.springframework.security.core.userdetails.User.withUsername(user.getEmail()).password(user.getPassword()).authorities("ROLE_" + user.getRole()).build();
        return new AuthResponse(jwt.generateToken(details, user.getRole().name()), user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
