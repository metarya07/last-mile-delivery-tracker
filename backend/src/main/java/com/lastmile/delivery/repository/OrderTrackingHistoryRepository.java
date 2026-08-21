package com.lastmile.delivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.OrderTrackingHistory;

public interface OrderTrackingHistoryRepository
        extends JpaRepository<OrderTrackingHistory, Long> {

    List<OrderTrackingHistory> findByOrderIdOrderByCreatedAtAsc(
            Long orderId);
}