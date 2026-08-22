package com.lastmile.delivery.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.ApplicationStatus;
import com.lastmile.delivery.entity.DeliveryPartnerApplication;

public interface DeliveryPartnerApplicationRepository extends JpaRepository<DeliveryPartnerApplication, Long> {

    Optional<DeliveryPartnerApplication> findTopByApplicantIdOrderByCreatedAtDesc(Long applicantId);

    List<DeliveryPartnerApplication> findByApplicantIdOrderByCreatedAtDesc(Long applicantId);

    boolean existsByApplicantIdAndStatus(Long applicantId, ApplicationStatus status);

    List<DeliveryPartnerApplication> findAllByOrderByCreatedAtDesc();

    List<DeliveryPartnerApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);
}
