package com.lastmile.delivery.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

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
        SimpleMailMessage email = new SimpleMailMessage();

        email.setFrom(fromEmail);
        email.setTo(recipient);
        email.setSubject(subject);
        email.setText(message);

        mailSender.send(email);
    }
}