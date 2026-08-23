package com.lastmile.delivery.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastmile.delivery.dto.request.DeliveryPartnerApplicationRequest;
import com.lastmile.delivery.dto.request.RejectApplicationRequest;
import com.lastmile.delivery.dto.response.DeliveryPartnerApplicationResponse;
import com.lastmile.delivery.service.DeliveryPartnerApplicationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/delivery-partner-applications")
public class DeliveryPartnerApplicationController {

    private final DeliveryPartnerApplicationService applicationService;

    public DeliveryPartnerApplicationController(
            DeliveryPartnerApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @PreAuthorize("@rbac.hasPermission('PARTNER_APP_SUBMIT')")
    public ResponseEntity<DeliveryPartnerApplicationResponse> submitApplication(
            Authentication authentication,
            @Valid @RequestBody DeliveryPartnerApplicationRequest request) {

        DeliveryPartnerApplicationResponse response = applicationService.submit(
                authentication.getName(),
                request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/mine")
    @PreAuthorize("@rbac.hasPermission('PARTNER_APP_VIEW_OWN')")
    public ResponseEntity<DeliveryPartnerApplicationResponse> getMyApplication(
            Authentication authentication) {

        DeliveryPartnerApplicationResponse response = applicationService.getMyApplication(
                authentication.getName());

        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("@rbac.hasPermission('PARTNER_APP_VIEW_ALL')")
    public List<DeliveryPartnerApplicationResponse> getAllApplications() {
        return applicationService.getAllApplications();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@rbac.canAccessApplication(#id)")
    public DeliveryPartnerApplicationResponse getApplication(
            @PathVariable Long id) {
        return applicationService.getApplication(id);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@rbac.hasPermission('PARTNER_APP_REVIEW')")
    public DeliveryPartnerApplicationResponse approveApplication(
            Authentication authentication,
            @PathVariable Long id) {

        return applicationService.approve(
                id,
                authentication.getName());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("@rbac.hasPermission('PARTNER_APP_REVIEW')")
    public DeliveryPartnerApplicationResponse rejectApplication(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody RejectApplicationRequest request) {

        return applicationService.reject(
                id,
                authentication.getName(),
                request);
    }
}
