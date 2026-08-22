package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.AvailabilityRequest;
import com.lastmile.delivery.dto.response.UserResponse;
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
    public List<UserResponse> getAvailableDeliveryAgents() {

        return userRepository
                .findByRoleAndAvailableTrue(Role.DELIVERY_AGENT)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PatchMapping("/availability")
    @PreAuthorize("hasRole('DELIVERY_AGENT')")
    public UserResponse updateAvailability(
            Authentication authentication,
            @Valid @RequestBody AvailabilityRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAvailable(request.available());

        return toResponse(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(@PathVariable Long id) {

        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }

        userRepository.deleteById(id);
    }

    private UserResponse toResponse(User user) {

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.isAvailable());
    }
}