package com.lastmile.delivery.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.entity.DeliveryOrder;
import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.DeliveryOrderRepository;
import com.lastmile.delivery.repository.UserRepository;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DeliveryOrderRepository orderRepository;
    private final UserRepository userRepository;

    public DashboardController(
            DeliveryOrderRepository orderRepository,
            UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DELIVERY_AGENT', 'CUSTOMER')")
    public Map<String, Long> summary(
            Authentication authentication) {
        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return switch (user.getRole()) {
            case ADMIN -> adminSummary();
            case DELIVERY_AGENT -> deliveryAgentSummary(user.getId());
            case CUSTOMER -> customerSummary(user.getId());
        };
    }

    private Map<String, Long> adminSummary() {
        Map<String, Long> result = new LinkedHashMap<>();

        result.put(
                "total",
                orderRepository.count());

        for (OrderStatus status : OrderStatus.values()) {
            result.put(
                    status.name(),
                    orderRepository.countByStatus(status));
        }

        return result;
    }

    private Map<String, Long> deliveryAgentSummary(
            Long agentId) {
        List<DeliveryOrder> orders = orderRepository.findByDeliveryAgentIdOrderByUpdatedAtDesc(
                agentId);

        return createSummary(orders);
    }

    private Map<String, Long> customerSummary(
            Long customerId) {
        List<DeliveryOrder> orders = orderRepository.findByCustomerIdOrderByCreatedAtDesc(
                customerId);

        return createSummary(orders);
    }

    private Map<String, Long> createSummary(
            List<DeliveryOrder> orders) {
        Map<String, Long> result = new LinkedHashMap<>();

        result.put(
                "total",
                (long) orders.size());

        for (OrderStatus status : OrderStatus.values()) {
            long count = orders.stream()
                    .filter(order -> order.getStatus() == status)
                    .count();

            result.put(
                    status.name(),
                    count);
        }

        return result;
    }
}