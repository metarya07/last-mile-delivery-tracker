package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CodChargeRepository extends JpaRepository<CodCharge, Long> { Optional<CodCharge> findByOrderType(OrderType orderType); }
