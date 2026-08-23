package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.AvailabilityRequest;
import com.lastmile.delivery.dto.request.UpdateRoleRequest;
import com.lastmile.delivery.dto.response.UserResponse;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.entity.Zone;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.repository.ZoneRepository;
import com.lastmile.delivery.service.AuditService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final ZoneRepository zoneRepository;
    private final AuditService auditService;

    public UserController(
            UserRepository userRepository,
            ZoneRepository zoneRepository,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.zoneRepository = zoneRepository;
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("@rbac.hasPermission('USER_VIEW_ALL')")
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/delivery-agents")
    @PreAuthorize("@rbac.hasPermission('USER_VIEW_AGENTS')")
    public List<UserResponse> getDeliveryAgents(
            @RequestParam(required = false) Boolean available) {

        List<User> agents = (available != null && available)
                ? userRepository.findByRoleAndAvailableTrue(Role.DELIVERY_AGENT)
                : userRepository.findByRole(Role.DELIVERY_AGENT);

        return agents
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("@rbac.canManageUserRole(#id, #request.role())")
    public UserResponse updateUserRole(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request) {

        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));

        Role oldRole = targetUser.getRole();
        targetUser.setRole(request.role());

        if (request.assignedZoneId() != null) {
            Zone zone = zoneRepository.findById(request.assignedZoneId())
                    .orElseThrow(() -> new IllegalArgumentException("Assigned zone not found"));
            targetUser.setAssignedZone(zone);
        }

        User saved = userRepository.save(targetUser);

        auditService.logSuccess(
                null,
                authentication.getName(),
                "ADMIN",
                "ROLE_CHANGED",
                "USER",
                id.toString(),
                "Changed user " + targetUser.getEmail() + " role from " + oldRole + " to " + request.role());

        return toResponse(saved);
    }

    @PatchMapping("/availability")
    @PreAuthorize("@rbac.hasPermission('USER_UPDATE_OWN_AVAILABILITY')")
    public UserResponse updateAvailability(
            Authentication authentication,
            @Valid @RequestBody AvailabilityRequest request) {

        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAvailable(request.available());
        User saved = userRepository.save(user);

        auditService.logSuccess(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                "AVAILABILITY_CHANGED",
                "USER",
                user.getId().toString(),
                "Toggled duty availability to " + request.available());

        return toResponse(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@rbac.hasPermission('USER_DELETE')")
    public void deleteUser(
            Authentication authentication,
            @PathVariable Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        userRepository.deleteById(id);

        auditService.logSuccess(
                null,
                authentication.getName(),
                "ADMIN",
                "USER_DELETED",
                "USER",
                id.toString(),
                "Deleted user account " + user.getEmail());
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