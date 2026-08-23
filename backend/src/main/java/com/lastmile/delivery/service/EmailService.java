package com.lastmile.delivery.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:dispatch@lastmiledelivery.com}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendEmail(String recipient, String subject, String message) {
        if (smtpUsername == null || smtpUsername.isBlank() || "none".equalsIgnoreCase(smtpUsername)) {
            logger.warn("Brevo SMTP credentials not configured (BREVO_SMTP_USERNAME is empty). Email notification skipped for recipient: {}", recipient);
            logger.info("Email content preview -> To: {} | Subject: {} | Content:\n{}", recipient, subject, message);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(message, false);

            mailSender.send(mimeMessage);
            logger.info("Successfully dispatched email notification to {}", recipient);
        } catch (Exception e) {
            logger.error("Failed to send email notification to {}: {}", recipient, e.getMessage(), e);
        }
    }

    public void sendHtmlEmail(String recipient, String subject, String htmlContent) {
        if (smtpUsername == null || smtpUsername.isBlank() || "none".equalsIgnoreCase(smtpUsername)) {
            logger.warn("Brevo SMTP credentials not configured. HTML email skipped for recipient: {}", recipient);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "utf-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            logger.info("Successfully dispatched HTML email notification to {}", recipient);
        } catch (Exception e) {
            logger.error("Failed to send HTML email notification to {}: {}", recipient, e.getMessage(), e);
        }
    }
}