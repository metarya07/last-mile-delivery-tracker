package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface RateCardRepository extends JpaRepository<RateCard, Long> { Optional<RateCard> findByPickupZoneIdAndDropZoneIdAndOrderType(Long pickupZoneId, Long dropZoneId, OrderType orderType); }
