package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.AvailabilityRequest;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/delivery-agents")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAvailableDeliveryAgents() {
        return userRepository.findByRoleAndAvailableTrue(
                Role.DELIVERY_AGENT);
    }

    @PatchMapping("/availability")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public User updateAvailability(
            Authentication authentication,
            @Valid @RequestBody AvailabilityRequest request) {
        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAvailable(request.available());

        return userRepository.save(user);
    }
}