package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.CreateOrderRequest;
import com.lastmile.delivery.dto.request.RescheduleOrderRequest;
import com.lastmile.delivery.dto.request.StatusUpdateRequest;
import com.lastmile.delivery.dto.response.DeliveryAttemptResponse;
import com.lastmile.delivery.dto.response.OrderResponse;
import com.lastmile.delivery.dto.response.TrackingHistoryResponse;
import com.lastmile.delivery.service.OrderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<OrderResponse> createOrder(
            Authentication authentication,
            @Valid @RequestBody CreateOrderRequest request) {

        OrderResponse response = orderService.create(
                authentication.getName(),
                request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public List<OrderResponse> getMyOrders(
            Authentication authentication) {

        return orderService.mine(authentication.getName());
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(
            Authentication authentication,
            @PathVariable Long id) {

        return orderService.get(
                authentication.getName(),
                id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DELIVERY_AGENT')")
    public OrderResponse updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request) {

        return orderService.transition(
                authentication.getName(),
                id,
                request);
    }

    @PostMapping("/{id}/assign/{agentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public OrderResponse assignAgent(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable Long agentId) {

        return orderService.assign(
                id,
                agentId,
                authentication.getName());
    }

    @PostMapping("/{id}/auto-assign")
    @PreAuthorize("hasRole('ADMIN')")
    public OrderResponse autoAssignAgent(
            Authentication authentication,
            @PathVariable Long id) {

        return orderService.autoAssign(
                id,
                authentication.getName());
    }

    @PostMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public OrderResponse rescheduleOrder(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) RescheduleOrderRequest request) {

        return orderService.reschedule(
                id,
                authentication.getName(),
                request != null ? request : new RescheduleOrderRequest(null, null));
    }

    @GetMapping("/{id}/tracking")
    public List<TrackingHistoryResponse> getTrackingHistory(
            Authentication authentication,
            @PathVariable Long id) {

        return orderService.getTrackingHistory(
                authentication.getName(),
                id);
    }

    @GetMapping("/{id}/attempts")
    public List<DeliveryAttemptResponse> getDeliveryAttempts(
            Authentication authentication,
            @PathVariable Long id) {

        return orderService.getDeliveryAttempts(
                authentication.getName(),
                id);
    }
}