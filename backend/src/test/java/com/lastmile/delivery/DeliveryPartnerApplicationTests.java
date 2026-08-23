package com.lastmile.delivery;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.lastmile.delivery.dto.request.DeliveryPartnerApplicationRequest;
import com.lastmile.delivery.dto.request.RejectApplicationRequest;
import com.lastmile.delivery.dto.response.DeliveryPartnerApplicationResponse;
import com.lastmile.delivery.entity.ApplicationStatus;
import com.lastmile.delivery.entity.DeliveryPartnerApplication;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.repository.DeliveryPartnerApplicationRepository;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.service.DeliveryPartnerApplicationService;

@ExtendWith(MockitoExtension.class)
class DeliveryPartnerApplicationTests {

    @Mock
    private DeliveryPartnerApplicationRepository applicationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DeliveryPartnerApplicationService applicationService;

    private User customer;
    private User admin;
    private User agent;

    @BeforeEach
    void setUp() {
        customer = new User();
        customer.setId(10L);
        customer.setName("John Customer");
        customer.setEmail("john@example.com");
        customer.setRole(Role.CUSTOMER);
        customer.setAvailable(false);

        admin = new User();
        admin.setId(1L);
        admin.setName("Admin Boss");
        admin.setEmail("admin@example.com");
        admin.setRole(Role.ADMIN);

        agent = new User();
        agent.setId(5L);
        agent.setName("Existing Agent");
        agent.setEmail("agent@example.com");
        agent.setRole(Role.DELIVERY_AGENT);
    }

    @Test
    void customerCanSubmitApplicationSuccessfully() {
        DeliveryPartnerApplicationRequest request = new DeliveryPartnerApplicationRequest(
                "MOTORCYCLE",
                "DL-01-AB-1234",
                "LIC-99887766",
                "North Zone");

        when(userRepository.findByEmailIgnoreCase("john@example.com"))
                .thenReturn(Optional.of(customer));
        when(applicationRepository.existsByApplicantIdAndStatus(10L, ApplicationStatus.PENDING))
                .thenReturn(false);

        when(applicationRepository.save(any(DeliveryPartnerApplication.class)))
                .thenAnswer(invocation -> {
                    DeliveryPartnerApplication app = invocation.getArgument(0);
                    app.setId(100L);
                    app.setCreatedAt(Instant.now());
                    return app;
                });

        DeliveryPartnerApplicationResponse response = applicationService.submit("john@example.com", request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(10L, response.applicantId());
        assertEquals("MOTORCYCLE", response.vehicleType());
        assertEquals("DL-01-AB-1234", response.vehicleNumber());
        assertEquals("LIC-99887766", response.drivingLicense());
        assertEquals("North Zone", response.preferredArea());
        assertEquals(ApplicationStatus.PENDING, response.status());

        verify(applicationRepository).save(any(DeliveryPartnerApplication.class));
    }

    @Test
    void duplicatePendingApplicationIsPrevented() {
        DeliveryPartnerApplicationRequest request = new DeliveryPartnerApplicationRequest(
                "SCOOTER",
                "DL-02-CD-5678",
                "LIC-11223344",
                "South Zone");

        when(userRepository.findByEmailIgnoreCase("john@example.com"))
                .thenReturn(Optional.of(customer));
        when(applicationRepository.existsByApplicantIdAndStatus(10L, ApplicationStatus.PENDING))
                .thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            applicationService.submit("john@example.com", request);
        });

        assertTrue(ex.getMessage().contains("already have an active application under review"));
        verify(applicationRepository, never()).save(any(DeliveryPartnerApplication.class));
    }

    @Test
    void nonCustomerCannotSubmitApplication() {
        DeliveryPartnerApplicationRequest request = new DeliveryPartnerApplicationRequest(
                "VAN",
                "DL-03-EF-9012",
                "LIC-55443322",
                "Central");

        when(userRepository.findByEmailIgnoreCase("agent@example.com"))
                .thenReturn(Optional.of(agent));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            applicationService.submit("agent@example.com", request);
        });

        assertTrue(ex.getMessage().contains("Only customers can apply"));
        verify(applicationRepository, never()).save(any(DeliveryPartnerApplication.class));
    }

    @Test
    void adminCanRejectPendingApplicationWithReason() {
        DeliveryPartnerApplication app = new DeliveryPartnerApplication();
        app.setId(100L);
        app.setApplicant(customer);
        app.setVehicleType("MOTORCYCLE");
        app.setDrivingLicense("LIC-99887766");
        app.setStatus(ApplicationStatus.PENDING);
        app.setCreatedAt(Instant.now());

        RejectApplicationRequest rejectRequest = new RejectApplicationRequest("Invalid driving license copy uploaded.");

        when(userRepository.findByEmailIgnoreCase("admin@example.com"))
                .thenReturn(Optional.of(admin));
        when(applicationRepository.findById(100L))
                .thenReturn(Optional.of(app));
        when(applicationRepository.save(any(DeliveryPartnerApplication.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryPartnerApplicationResponse response = applicationService.reject(
                100L,
                "admin@example.com",
                rejectRequest);

        assertNotNull(response);
        assertEquals(ApplicationStatus.REJECTED, response.status());
        assertEquals("Invalid driving license copy uploaded.", response.rejectionReason());
        assertEquals(1L, response.reviewedById());
        assertEquals("Admin Boss", response.reviewedByName());
        assertNotNull(response.reviewedAt());

        // Customer role remains CUSTOMER
        assertEquals(Role.CUSTOMER, customer.getRole());
        verify(userRepository, never()).save(customer);
    }

    @Test
    void customerCanReapplyAfterRejection() {
        // When previous application was rejected, existsByApplicantIdAndStatus(..., PENDING) is false
        when(userRepository.findByEmailIgnoreCase("john@example.com"))
                .thenReturn(Optional.of(customer));
        when(applicationRepository.existsByApplicantIdAndStatus(10L, ApplicationStatus.PENDING))
                .thenReturn(false);

        DeliveryPartnerApplicationRequest newRequest = new DeliveryPartnerApplicationRequest(
                "SCOOTER",
                "DL-01-AB-1234",
                "LIC-CORRECTED-9988",
                "North Zone");

        when(applicationRepository.save(any(DeliveryPartnerApplication.class)))
                .thenAnswer(invocation -> {
                    DeliveryPartnerApplication app = invocation.getArgument(0);
                    app.setId(101L);
                    app.setCreatedAt(Instant.now());
                    return app;
                });

        DeliveryPartnerApplicationResponse response = applicationService.submit("john@example.com", newRequest);

        assertNotNull(response);
        assertEquals(101L, response.id());
        assertEquals(ApplicationStatus.PENDING, response.status());
    }

    @Test
    void adminCanApprovePendingApplicationAndMutateRole() {
        DeliveryPartnerApplication app = new DeliveryPartnerApplication();
        app.setId(100L);
        app.setApplicant(customer);
        app.setVehicleType("MOTORCYCLE");
        app.setDrivingLicense("LIC-99887766");
        app.setStatus(ApplicationStatus.PENDING);
        app.setCreatedAt(Instant.now());

        when(userRepository.findByEmailIgnoreCase("admin@example.com"))
                .thenReturn(Optional.of(admin));
        when(applicationRepository.findById(100L))
                .thenReturn(Optional.of(app));
        when(userRepository.save(any(User.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(applicationRepository.save(any(DeliveryPartnerApplication.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryPartnerApplicationResponse response = applicationService.approve(100L, "admin@example.com");

        assertNotNull(response);
        assertEquals(ApplicationStatus.APPROVED, response.status());
        assertEquals(1L, response.reviewedById());
        assertEquals("Admin Boss", response.reviewedByName());
        assertNotNull(response.reviewedAt());

        // Role changed to DELIVERY_AGENT and availability set to true
        assertEquals(Role.DELIVERY_AGENT, customer.getRole());
        assertTrue(customer.isAvailable());
        verify(userRepository).save(customer);
        verify(applicationRepository).save(app);
    }

    @Test
    void nonAdminCannotApproveOrRejectApplication() {
        when(userRepository.findByEmailIgnoreCase("john@example.com"))
                .thenReturn(Optional.of(customer));

        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () -> {
            applicationService.approve(100L, "john@example.com");
        });
        assertTrue(ex1.getMessage().contains("Only administrators"));

        RejectApplicationRequest rejectRequest = new RejectApplicationRequest("No reason");
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () -> {
            applicationService.reject(100L, "john@example.com", rejectRequest);
        });
        assertTrue(ex2.getMessage().contains("Only administrators"));
    }

    @Test
    void cannotApproveAlreadyProcessedApplication() {
        DeliveryPartnerApplication app = new DeliveryPartnerApplication();
        app.setId(100L);
        app.setApplicant(customer);
        app.setStatus(ApplicationStatus.APPROVED);

        when(userRepository.findByEmailIgnoreCase("admin@example.com"))
                .thenReturn(Optional.of(admin));
        when(applicationRepository.findById(100L))
                .thenReturn(Optional.of(app));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            applicationService.approve(100L, "admin@example.com");
        });
        assertTrue(ex.getMessage().contains("Only pending applications can be approved"));
    }

    @Test
    void customerCanRetrieveOwnApplication() {
        DeliveryPartnerApplication app = new DeliveryPartnerApplication();
        app.setId(100L);
        app.setApplicant(customer);
        app.setVehicleType("MOTORCYCLE");
        app.setStatus(ApplicationStatus.PENDING);

        when(userRepository.findByEmailIgnoreCase("john@example.com"))
                .thenReturn(Optional.of(customer));
        when(applicationRepository.findTopByApplicantIdOrderByCreatedAtDesc(10L))
                .thenReturn(Optional.of(app));

        DeliveryPartnerApplicationResponse response = applicationService.getMyApplication("john@example.com");

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(ApplicationStatus.PENDING, response.status());
    }

    @Test
    void adminCanListAllApplications() {
        DeliveryPartnerApplication app1 = new DeliveryPartnerApplication();
        app1.setId(100L);
        app1.setApplicant(customer);
        app1.setStatus(ApplicationStatus.PENDING);

        DeliveryPartnerApplication app2 = new DeliveryPartnerApplication();
        app2.setId(101L);
        app2.setApplicant(customer);
        app2.setStatus(ApplicationStatus.APPROVED);

        when(applicationRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(app1, app2));

        List<DeliveryPartnerApplicationResponse> list = applicationService.getAllApplications();

        assertEquals(2, list.size());
        assertEquals(100L, list.get(0).id());
        assertEquals(101L, list.get(1).id());
    }
}
