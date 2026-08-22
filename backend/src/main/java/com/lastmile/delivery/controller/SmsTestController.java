package com.lastmile.delivery.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.service.SmsService;

@RestController
@RequestMapping("/api/test")
public class SmsTestController {

    private final SmsService smsService;

    public SmsTestController(SmsService smsService) {
        this.smsService = smsService;
    }

    @PostMapping("/sms")
    public ResponseEntity<Map<String, String>> testSms(
            @RequestBody SmsTestRequest request) {

        smsService.sendSms(
                request.phone(),
                request.message());

        return ResponseEntity.ok(
                Map.of("message", "SMS sent successfully"));
    }

    public record SmsTestRequest(
            String phone,
            String message) {
    }
}