package com.lastmile.delivery.controller;

import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.repository.DeliveryOrderRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController @RequestMapping("/api/dashboard")
public class DashboardController {
    private final DeliveryOrderRepository orders;
    public DashboardController(DeliveryOrderRepository orders) { this.orders = orders; }
    @GetMapping @PreAuthorize("hasAnyRole('ADMIN','DELIVERY_AGENT','CUSTOMER')")
    public Map<String, Long> summary() {
        Map<String, Long> result = new LinkedHashMap<>(); result.put("total", orders.count());
        for (OrderStatus status : OrderStatus.values()) result.put(status.name(), orders.countByStatus(status));
        return result;
    }
}
