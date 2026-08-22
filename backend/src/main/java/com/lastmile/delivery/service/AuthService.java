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
        private final EmailService emailService;

        public AuthService(
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        EmailService emailService) {

                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.jwtService = jwtService;
                this.emailService = emailService;
        }

        public AuthResponse register(RegisterRequest request) {
                String email = request.email().trim().toLowerCase();

                if (userRepository.existsByEmailIgnoreCase(email)) {
                        throw new IllegalArgumentException(
                                        "Email is already registered");
                }

                User user = new User();
                user.setName(request.name());
                user.setEmail(email);
                user.setPassword(
                                passwordEncoder.encode(request.password()));
                user.setPhone(request.phone());
                user.setRole(Role.CUSTOMER);

                User savedUser = userRepository.save(user);

                sendWelcomeEmail(savedUser);

                return createResponse(savedUser);
        }

        public AuthResponse login(LoginRequest request) {
                String email = request.email().trim();

                User user = userRepository
                                .findByEmailIgnoreCase(email)
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
                                .findByEmailIgnoreCase(email.trim())
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "User not found"));

                return createResponse(user);
        }

        private void sendWelcomeEmail(User user) {
                String subject = "Welcome to Last Mile Delivery Tracker";

                String message = """
                                Hello %s,

                                Welcome to Last Mile Delivery Tracker.

                                Your customer account has been successfully created.

                                Registered email: %s

                                You can now log in and start using the delivery tracking system.

                                Regards,

                                Last Mile Delivery Tracker
                                """.formatted(
                                user.getName(),
                                user.getEmail());

                try {
                        emailService.sendEmail(
                                        user.getEmail(),
                                        subject,
                                        message);

                        System.out.println(
                                        "Welcome email sent to " + user.getEmail());

                } catch (RuntimeException exception) {
                        System.err.println(
                                        "Failed to send welcome email to "
                                                        + user.getEmail());
                }
        }

        private AuthResponse createResponse(User user) {
                UserDetails userDetails = org.springframework.security.core.userdetails.User
                                .withUsername(user.getEmail())
                                .password(user.getPassword())
                                .authorities("ROLE_" + user.getRole().name())
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