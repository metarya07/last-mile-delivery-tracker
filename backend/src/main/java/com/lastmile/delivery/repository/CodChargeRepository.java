package com.lastmile.delivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.CodCharge;
import com.lastmile.delivery.entity.OrderType;

public interface CodChargeRepository
        extends JpaRepository<CodCharge, Long> {

    Optional<CodCharge> findByOrderType(OrderType orderType);
}