package com.lastmile.delivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.PasswordResetOtp;
import com.lastmile.delivery.entity.User;

public interface PasswordResetOtpRepository
        extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByUserAndUsedFalseOrderByCreatedAtDesc(User user);
}