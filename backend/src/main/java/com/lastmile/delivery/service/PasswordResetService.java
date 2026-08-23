package com.lastmile.delivery.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.lastmile.delivery.entity.PasswordResetOtp;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.PasswordResetOtpRepository;
import com.lastmile.delivery.repository.UserRepository;

@Service
public class PasswordResetService {

        private static final long OTP_EXPIRATION_MINUTES = 10;

        private final UserRepository userRepository;
        private final PasswordResetOtpRepository otpRepository;
        private final PasswordEncoder passwordEncoder;
        private final EmailService emailService;
        private final SmsService smsService;

        private final SecureRandom secureRandom = new SecureRandom();

        public PasswordResetService(
                        UserRepository userRepository,
                        PasswordResetOtpRepository otpRepository,
                        PasswordEncoder passwordEncoder,
                        EmailService emailService,
                        SmsService smsService) {

                this.userRepository = userRepository;
                this.otpRepository = otpRepository;
                this.passwordEncoder = passwordEncoder;
                this.emailService = emailService;
                this.smsService = smsService;
        }

        public void requestPasswordReset(String email) {

                User user = userRepository
                                .findByEmailIgnoreCase(email.trim())
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "No account found with this email"));

                String otp = generateOtp();

                PasswordResetOtp passwordResetOtp = new PasswordResetOtp();

                passwordResetOtp.setUser(user);

                passwordResetOtp.setOtpHash(
                                passwordEncoder.encode(otp));

                passwordResetOtp.setExpiresAt(
                                Instant.now().plus(
                                                Duration.ofMinutes(
                                                                OTP_EXPIRATION_MINUTES)));

                passwordResetOtp.setUsed(false);

                otpRepository.save(passwordResetOtp);

                sendOtp(user, otp);
        }

        public void verifyOtp(
                        String email,
                        String otp) {

                User user = findUser(email);

                PasswordResetOtp resetOtp = findActiveOtp(user);

                validateOtp(resetOtp, otp);
        }

        public void resetPassword(
                        String email,
                        String otp,
                        String newPassword) {

                User user = findUser(email);

                PasswordResetOtp resetOtp = findActiveOtp(user);

                validateOtp(resetOtp, otp);

                user.setPassword(
                                passwordEncoder.encode(newPassword));

                userRepository.save(user);

                resetOtp.setUsed(true);

                otpRepository.save(resetOtp);
        }

        private User findUser(String email) {

                return userRepository
                                .findByEmailIgnoreCase(email.trim())
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "No account found with this email"));
        }

        private PasswordResetOtp findActiveOtp(User user) {

                return otpRepository
                                .findTopByUserAndUsedFalseOrderByCreatedAtDesc(user)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "No active password reset OTP found"));
        }

        private void validateOtp(
                        PasswordResetOtp resetOtp,
                        String otp) {

                if (resetOtp.isUsed()) {
                        throw new IllegalArgumentException(
                                        "OTP has already been used");
                }

                if (Instant.now().isAfter(resetOtp.getExpiresAt())) {
                        throw new IllegalArgumentException(
                                        "OTP has expired");
                }

                if (!passwordEncoder.matches(
                                otp,
                                resetOtp.getOtpHash())) {

                        throw new IllegalArgumentException(
                                        "Invalid OTP");
                }
        }

        private String generateOtp() {

                return String.valueOf(
                                100000 + secureRandom.nextInt(900000));
        }

        private void sendOtp(
                        User user,
                        String otp) {

                try {
                        emailService.sendPasswordResetOtpEmail(
                                        user.getEmail(),
                                        user.getName(),
                                        otp);

                        System.out.println(
                                        "Password reset OTP email sent to "
                                                        + user.getEmail());

                } catch (RuntimeException exception) {

                        System.err.println(
                                        "Failed to send password reset email to "
                                                        + user.getEmail());
                }

                if (user.getPhone() != null
                                && !user.getPhone().isBlank()) {

                        try {

                                smsService.sendOtp(
                                                user.getPhone(),
                                                otp);

                                System.out.println(
                                                "Password reset OTP SMS sent to "
                                                                + user.getPhone());

                        } catch (RuntimeException exception) {

                                System.err.println(
                                                "Failed to send password reset SMS to "
                                                                + user.getPhone());
                        }
                }
        }
}