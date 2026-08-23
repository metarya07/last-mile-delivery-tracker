package com.lastmile.delivery.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.lastmile.delivery.entity.DeliveryOrder;
import com.lastmile.delivery.entity.DeliveryPartnerApplication;
import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.DeliveryOrderRepository;
import com.lastmile.delivery.repository.DeliveryPartnerApplicationRepository;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.service.AuditService;

@Component("rbac")
public class RbacSecurityEvaluator {

    private final UserRepository userRepository;
    private final DeliveryOrderRepository orderRepository;
    private final DeliveryPartnerApplicationRepository applicationRepository;
    private final AuditService auditService;

    public RbacSecurityEvaluator(
            UserRepository userRepository,
            DeliveryOrderRepository orderRepository,
            DeliveryPartnerApplicationRepository applicationRepository,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.applicationRepository = applicationRepository;
        this.auditService = auditService;
    }

    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return Optional.empty();
        }
        return userRepository.findByEmailIgnoreCase(auth.getName());
    }

    public boolean hasPermission(String permissionName) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }

        boolean hasPerm = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("PERM_" + permissionName)
                        || a.getAuthority().equals("ROLE_ADMIN"));

        if (!hasPerm) {
            getCurrentUser().ifPresent(u -> auditService.logDenied(
                    u.getId(),
                    u.getEmail(),
                    u.getRole().name(),
                    "UNAUTHORIZED_ACCESS_ATTEMPT",
                    "PERMISSION",
                    permissionName,
                    "User lacks required permission: " + permissionName));
        }

        return hasPerm;
    }

    public boolean canAccessOrder(Long orderId) {
        if (orderId == null) {
            return false;
        }

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        Optional<DeliveryOrder> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return true; // Let controller throw 404
        }

        DeliveryOrder order = orderOpt.get();

        boolean allowed = switch (user.getRole()) {
            case ADMIN, DISPATCHER -> true;
            case DELIVERY_AGENT -> order.getDeliveryAgent() != null
                    && order.getDeliveryAgent().getId().equals(user.getId());
            case WAREHOUSE_STAFF -> {
                if (user.getAssignedZone() == null) {
                    yield true;
                }
                yield (order.getPickupZone() != null && order.getPickupZone().getId().equals(user.getAssignedZone().getId()))
                        || (order.getDropZone() != null && order.getDropZone().getId().equals(user.getAssignedZone().getId()));
            }
            case CUSTOMER -> order.getCustomer() != null
                    && order.getCustomer().getId().equals(user.getId());
        };

        if (!allowed) {
            auditService.logDenied(
                    user.getId(),
                    user.getEmail(),
                    user.getRole().name(),
                    "UNAUTHORIZED_ACCESS_ATTEMPT",
                    "ORDER",
                    orderId.toString(),
                    "IDOR Attempt: User attempted to access order outside authorized scope");
        }

        return allowed;
    }

    public boolean canUpdateOrderStatus(Long orderId, OrderStatus newStatus) {
        if (orderId == null) {
            return false;
        }

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        Optional<DeliveryOrder> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return true; // Let controller throw 404
        }

        DeliveryOrder order = orderOpt.get();

        boolean allowed = switch (user.getRole()) {
            case ADMIN, DISPATCHER -> true;
            case DELIVERY_AGENT -> order.getDeliveryAgent() != null
                    && order.getDeliveryAgent().getId().equals(user.getId());
            case WAREHOUSE_STAFF -> {
                // Warehouse staff can advance status from PLACED -> PICKED_UP or IN_TRANSIT
                boolean validStage = newStatus == OrderStatus.PICKED_UP || newStatus == OrderStatus.IN_TRANSIT;
                if (user.getAssignedZone() == null) {
                    yield validStage;
                }
                yield validStage && ((order.getPickupZone() != null && order.getPickupZone().getId().equals(user.getAssignedZone().getId()))
                        || (order.getDropZone() != null && order.getDropZone().getId().equals(user.getAssignedZone().getId())));
            }
            case CUSTOMER -> false;
        };

        if (!allowed) {
            auditService.logDenied(
                    user.getId(),
                    user.getEmail(),
                    user.getRole().name(),
                    "UNAUTHORIZED_STATUS_UPDATE_ATTEMPT",
                    "ORDER",
                    orderId.toString(),
                    "User attempted unauthorized status update to " + newStatus);
        }

        return allowed;
    }

    public boolean canUpdateLocation(Long orderId) {
        if (orderId == null) {
            return false;
        }

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        if (user.getRole() == Role.ADMIN) {
            return true;
        }

        if (user.getRole() == Role.DELIVERY_AGENT) {
            Optional<DeliveryOrder> orderOpt = orderRepository.findById(orderId);
            return orderOpt.map(order -> order.getDeliveryAgent() != null
                    && order.getDeliveryAgent().getId().equals(user.getId())).orElse(true);
        }

        return false;
    }

    public boolean canUploadPod(Long orderId) {
        return canUpdateLocation(orderId);
    }

    public boolean canRescheduleOrder(Long orderId) {
        if (orderId == null) {
            return false;
        }

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.DISPATCHER) {
            return true;
        }

        if (user.getRole() == Role.CUSTOMER) {
            Optional<DeliveryOrder> orderOpt = orderRepository.findById(orderId);
            return orderOpt.map(order -> order.getCustomer() != null
                    && order.getCustomer().getId().equals(user.getId())).orElse(true);
        }

        return false;
    }

    public boolean canAccessApplication(Long applicationId) {
        if (applicationId == null) {
            return false;
        }

        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.DISPATCHER) {
            return true;
        }

        if (user.getRole() == Role.CUSTOMER) {
            Optional<DeliveryPartnerApplication> appOpt = applicationRepository.findById(applicationId);
            return appOpt.map(app -> app.getApplicant() != null
                    && app.getApplicant().getId().equals(user.getId())).orElse(true);
        }

        return false;
    }

    public boolean canManageUserRole(Long targetUserId, Role newRole) {
        Optional<User> currentUserOpt = getCurrentUser();
        if (currentUserOpt.isEmpty()) {
            return false;
        }

        User user = currentUserOpt.get();
        // Only ADMIN can manage roles
        if (user.getRole() != Role.ADMIN) {
            auditService.logDenied(
                    user.getId(),
                    user.getEmail(),
                    user.getRole().name(),
                    "PRIVILEGE_ESCALATION_ATTEMPT",
                    "USER",
                    String.valueOf(targetUserId),
                    "Non-admin attempted to change role to " + newRole);
            return false;
        }

        return true;
    }
}
