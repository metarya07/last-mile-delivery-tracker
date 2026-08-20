package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder, Long> {
    List<DeliveryOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<DeliveryOrder> findByDeliveryAgentIdOrderByUpdatedAtDesc(Long deliveryAgentId);
    long countByStatus(OrderStatus status);
}
