package com.lastmile.delivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.DeliveryOrder;
import com.lastmile.delivery.entity.OrderStatus;

public interface DeliveryOrderRepository
        extends JpaRepository<DeliveryOrder, Long> {

    List<DeliveryOrder> findByCustomerIdOrderByCreatedAtDesc(
            Long customerId);

    List<DeliveryOrder> findByDeliveryAgentIdOrderByUpdatedAtDesc(
            Long deliveryAgentId);

    long countByStatus(OrderStatus status);
}