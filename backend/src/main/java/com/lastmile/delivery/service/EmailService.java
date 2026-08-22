package com.lastmile.delivery.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromEmail) {

        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendEmail(
            String recipient,
            String subject,
            String message) {

        try {
            SimpleMailMessage email = new SimpleMailMessage();

            email.setFrom(fromEmail);
            email.setTo(recipient);
            email.setSubject(subject);
            email.setText(message);

            mailSender.send(email);

        } catch (Exception e) {

            logger.error(
                    "Failed to send email notification to {}: {}",
                    recipient,
                    e.getMessage());
        }
    }
}