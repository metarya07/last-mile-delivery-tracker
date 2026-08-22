package com.lastmile.delivery.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lastmile.delivery.dto.request.DeliveryPartnerApplicationRequest;
import com.lastmile.delivery.dto.request.RejectApplicationRequest;
import com.lastmile.delivery.dto.response.DeliveryPartnerApplicationResponse;
import com.lastmile.delivery.entity.ApplicationStatus;
import com.lastmile.delivery.entity.DeliveryPartnerApplication;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.DeliveryPartnerApplicationRepository;
import com.lastmile.delivery.repository.UserRepository;

@Service
@Transactional
public class DeliveryPartnerApplicationService {

    private final DeliveryPartnerApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public DeliveryPartnerApplicationService(
            DeliveryPartnerApplicationRepository applicationRepository,
            UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    public DeliveryPartnerApplicationResponse submit(
            String customerEmail,
            DeliveryPartnerApplicationRequest request) {

        User applicant = findUser(customerEmail);

        if (applicant.getRole() != Role.CUSTOMER) {
            throw new IllegalArgumentException("Only customers can apply to become delivery partners");
        }

        if (applicationRepository.existsByApplicantIdAndStatus(applicant.getId(), ApplicationStatus.PENDING)) {
            throw new IllegalArgumentException(
                    "You already have an active application under review. Please wait for an administrator decision.");
        }

        DeliveryPartnerApplication application = new DeliveryPartnerApplication();
        application.setApplicant(applicant);
        application.setVehicleType(request.vehicleType().trim());
        application.setVehicleNumber(request.vehicleNumber() != null ? request.vehicleNumber().trim() : null);
        application.setDrivingLicense(request.drivingLicense().trim());
        application.setPreferredArea(request.preferredArea() != null ? request.preferredArea().trim() : null);
        application.setStatus(ApplicationStatus.PENDING);

        DeliveryPartnerApplication saved = applicationRepository.save(application);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public DeliveryPartnerApplicationResponse getMyApplication(String customerEmail) {
        User applicant = findUser(customerEmail);
        return applicationRepository.findTopByApplicantIdOrderByCreatedAtDesc(applicant.getId())
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<DeliveryPartnerApplicationResponse> getMyApplications(String customerEmail) {
        User applicant = findUser(customerEmail);
        return applicationRepository.findByApplicantIdOrderByCreatedAtDesc(applicant.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeliveryPartnerApplicationResponse> getAllApplications() {
        return applicationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeliveryPartnerApplicationResponse getApplication(Long id) {
        DeliveryPartnerApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));
        return mapToResponse(application);
    }

    public DeliveryPartnerApplicationResponse approve(Long id, String adminEmail) {
        User reviewer = findUser(adminEmail);
        if (reviewer.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only administrators can approve applications");
        }

        DeliveryPartnerApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Only pending applications can be approved");
        }

        User applicant = application.getApplicant();
        if (applicant.getRole() != Role.CUSTOMER) {
            throw new IllegalArgumentException("Applicant is no longer a customer account");
        }

        // Promote role to DELIVERY_AGENT and activate availability
        applicant.setRole(Role.DELIVERY_AGENT);
        applicant.setAvailable(true);
        userRepository.save(applicant);

        // Update application state
        application.setStatus(ApplicationStatus.APPROVED);
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(reviewer);

        DeliveryPartnerApplication saved = applicationRepository.save(application);
        return mapToResponse(saved);
    }

    public DeliveryPartnerApplicationResponse reject(
            Long id,
            String adminEmail,
            RejectApplicationRequest request) {

        User reviewer = findUser(adminEmail);
        if (reviewer.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only administrators can reject applications");
        }

        DeliveryPartnerApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Application not found"));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalArgumentException("Only pending applications can be rejected");
        }

        application.setStatus(ApplicationStatus.REJECTED);
        application.setRejectionReason(request.reason().trim());
        application.setReviewedAt(Instant.now());
        application.setReviewedBy(reviewer);

        DeliveryPartnerApplication saved = applicationRepository.save(application);
        return mapToResponse(saved);
    }

    private User findUser(String email) {
        return userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private DeliveryPartnerApplicationResponse mapToResponse(DeliveryPartnerApplication app) {
        User applicant = app.getApplicant();
        User reviewer = app.getReviewedBy();

        return new DeliveryPartnerApplicationResponse(
                app.getId(),
                applicant != null ? applicant.getId() : null,
                applicant != null ? applicant.getName() : null,
                applicant != null ? applicant.getEmail() : null,
                applicant != null ? applicant.getPhone() : null,
                app.getVehicleType(),
                app.getVehicleNumber(),
                app.getDrivingLicense(),
                app.getPreferredArea(),
                app.getStatus(),
                app.getRejectionReason(),
                app.getCreatedAt(),
                app.getReviewedAt(),
                reviewer != null ? reviewer.getId() : null,
                reviewer != null ? reviewer.getName() : null);
    }
}
