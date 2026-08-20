package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.OrderTrackingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OrderTrackingHistoryRepository extends JpaRepository<OrderTrackingHistory, Long> { List<OrderTrackingHistory> findByOrderIdOrderByCreatedAtAsc(Long orderId); }
