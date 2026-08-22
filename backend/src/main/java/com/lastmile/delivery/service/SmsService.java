package com.lastmile.delivery.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class SmsService {

    private final RestClient restClient;
    private final String sender;

    public SmsService(
            @Value("${BREVO_API_KEY}") String apiKey,
            @Value("${BREVO_SMS_SENDER}") String sender) {

        this.sender = sender;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .defaultHeader("api-key", apiKey)
                .defaultHeader(
                        "accept",
                        MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public void sendSms(
            String recipient,
            String message) {

        Map<String, String> request = Map.of(
                "sender", sender,
                "recipient", normalizePhoneNumber(recipient),
                "content", message);

        String response = restClient.post()
                .uri("/transactionalSMS/send")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(String.class);

        System.out.println("Brevo SMS response: " + response);
    }

    public void sendOtp(
            String phoneNumber,
            String otp) {

        String message = """
                Your Last Mile Delivery Tracker OTP is %s.

                It is valid for 10 minutes.

                Do not share this OTP with anyone.
                """.formatted(otp);

        sendSms(phoneNumber, message);
    }

    private String normalizePhoneNumber(String phoneNumber) {

        String normalized = phoneNumber
                .trim()
                .replaceAll("[\\s-]", "");

        if (normalized.startsWith("+")) {
            return normalized;
        }

        if (normalized.startsWith("91")
                && normalized.length() == 12) {
            return "+" + normalized;
        }

        if (normalized.length() == 10) {
            return "+91" + normalized;
        }

        throw new IllegalArgumentException(
                "Invalid Indian phone number");
    }
}