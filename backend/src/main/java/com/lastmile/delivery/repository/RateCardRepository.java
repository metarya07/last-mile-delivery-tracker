package com.lastmile.delivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.RateCard;

public interface RateCardRepository
        extends JpaRepository<RateCard, Long> {

    Optional<RateCard> findByPickupZoneIdAndDropZoneIdAndOrderType(
            Long pickupZoneId,
            Long dropZoneId,
            OrderType orderType);
}