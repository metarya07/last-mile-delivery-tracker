package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.CodChargeRequest;
import com.lastmile.delivery.dto.request.CreateZoneAreaRequest;
import com.lastmile.delivery.dto.request.CreateZoneRequest;
import com.lastmile.delivery.dto.request.RateCardRequest;
import com.lastmile.delivery.dto.request.RateEstimateRequest;
import com.lastmile.delivery.dto.response.CodChargeResponse;
import com.lastmile.delivery.dto.response.RateCardResponse;
import com.lastmile.delivery.dto.response.RateEstimateResponse;
import com.lastmile.delivery.dto.response.ZoneAreaResponse;
import com.lastmile.delivery.dto.response.ZoneResponse;
import com.lastmile.delivery.service.RateConfigService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class RateConfigController {

    private final RateConfigService rateConfigService;

    public RateConfigController(RateConfigService rateConfigService) {
        this.rateConfigService = rateConfigService;
    }

    // --- Rate Calculation Engine (Pre-booking estimation) ---
    @PostMapping("/rates/estimate")
    public RateEstimateResponse estimateRate(
            @Valid @RequestBody RateEstimateRequest request) {

        return rateConfigService.estimate(request);
    }

    // --- Zones Management ---
    @GetMapping("/zones")
    public List<ZoneResponse> getAllZones() {
        return rateConfigService.getAllZones();
    }

    @PostMapping("/zones")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ZoneResponse createZone(
            @Valid @RequestBody CreateZoneRequest request) {

        return rateConfigService.createZone(request);
    }

    @PostMapping("/zones/{id}/areas")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ZoneAreaResponse addAreaToZone(
            @PathVariable Long id,
            @Valid @RequestBody CreateZoneAreaRequest request) {

        return rateConfigService.addAreaToZone(id, request);
    }

    // --- Rate Cards Management (B2B/B2C Intra & Inter-zone) ---
    @GetMapping("/rates")
    @PreAuthorize("hasRole('ADMIN')")
    public List<RateCardResponse> getAllRateCards() {
        return rateConfigService.getAllRateCards();
    }

    @PostMapping("/rates")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RateCardResponse> saveRateCard(
            @Valid @RequestBody RateCardRequest request) {

        RateCardResponse response = rateConfigService.saveRateCard(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/rates/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public RateCardResponse updateRateCard(
            @PathVariable Long id,
            @Valid @RequestBody RateCardRequest request) {

        return rateConfigService.updateRateCard(id, request);
    }

    // --- COD Surcharges Management ---
    @GetMapping("/rates/cod")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CodChargeResponse> getAllCodCharges() {
        return rateConfigService.getAllCodCharges();
    }

    @PutMapping("/rates/cod")
    @PreAuthorize("hasRole('ADMIN')")
    public CodChargeResponse saveCodCharge(
            @Valid @RequestBody CodChargeRequest request) {

        return rateConfigService.saveCodCharge(request);
    }
}
