package com.lastmile.delivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.DeliveryAttempt;

public interface DeliveryAttemptRepository
        extends JpaRepository<DeliveryAttempt, Long> {

    List<DeliveryAttempt> findByOrderIdOrderByAttemptedAtDesc(
            Long orderId);

    long countByOrderId(Long orderId);
}