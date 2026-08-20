package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.DeliveryAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliveryAttemptRepository extends JpaRepository<DeliveryAttempt, Long> { List<DeliveryAttempt> findByOrderIdOrderByAttemptedAtDesc(Long orderId); long countByOrderId(Long orderId); }
