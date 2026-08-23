package com.lastmile.delivery;

import java.math.BigDecimal;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.lastmile.delivery.dto.request.LocationUpdateRequest;
import com.lastmile.delivery.dto.request.ProofOfDeliveryRequest;
import com.lastmile.delivery.dto.request.StatusUpdateRequest;
import com.lastmile.delivery.dto.request.UpdateRoleRequest;
import com.lastmile.delivery.dto.response.OrderResponse;
import com.lastmile.delivery.dto.response.UserResponse;
import com.lastmile.delivery.entity.DeliveryAttempt;
import com.lastmile.delivery.entity.DeliveryOrder;
import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.PaymentType;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.entity.Zone;
import com.lastmile.delivery.repository.AuditLogRepository;
import com.lastmile.delivery.repository.DeliveryAttemptRepository;
import com.lastmile.delivery.repository.DeliveryOrderRepository;
import com.lastmile.delivery.repository.DeliveryPartnerApplicationRepository;
import com.lastmile.delivery.repository.OrderTrackingHistoryRepository;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.repository.ZoneRepository;
import com.lastmile.delivery.security.Permission;
import com.lastmile.delivery.security.RbacConfig;
import com.lastmile.delivery.security.RbacSecurityEvaluator;
import com.lastmile.delivery.service.AuditService;
import com.lastmile.delivery.service.EmailService;
import com.lastmile.delivery.service.OrderService;
import com.lastmile.delivery.controller.UserController;

@ExtendWith(MockitoExtension.class)
class RbacSecurityTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DeliveryOrderRepository orderRepository;

    @Mock
    private DeliveryPartnerApplicationRepository applicationRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private DeliveryAttemptRepository deliveryAttemptRepository;

    @Mock
    private OrderTrackingHistoryRepository trackingRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditService auditService;
    private RbacSecurityEvaluator rbacEvaluator;
    private OrderService orderService;
    private UserController userController;

    private User admin;
    private User dispatcher;
    private User agent1;
    private User agent2;
    private User warehouseStaff;
    private User customer1;
    private User customer2;

    private Zone zoneNorth;
    private Zone zoneSouth;
    private DeliveryOrder order1;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository);
        rbacEvaluator = new RbacSecurityEvaluator(userRepository, orderRepository, applicationRepository, auditService);
        orderService = new OrderService(
                orderRepository,
                userRepository,
                zoneRepository,
                null,
                null,
                trackingRepository,
                deliveryAttemptRepository,
                emailService,
                null,
                applicationRepository,
                auditService);
        userController = new UserController(userRepository, zoneRepository, auditService);

        zoneNorth = new Zone();
        zoneNorth.setId(1L);
        zoneNorth.setName("North Zone");

        zoneSouth = new Zone();
        zoneSouth.setId(2L);
        zoneSouth.setName("South Zone");

        admin = new User();
        admin.setId(1L);
        admin.setName("Admin User");
        admin.setEmail("admin@lastmile.com");
        admin.setRole(Role.ADMIN);

        dispatcher = new User();
        dispatcher.setId(2L);
        dispatcher.setName("Dispatcher User");
        dispatcher.setEmail("dispatcher@lastmile.com");
        dispatcher.setRole(Role.DISPATCHER);

        agent1 = new User();
        agent1.setId(3L);
        agent1.setName("Agent One");
        agent1.setEmail("agent1@lastmile.com");
        agent1.setRole(Role.DELIVERY_AGENT);
        agent1.setAvailable(true);

        agent2 = new User();
        agent2.setId(4L);
        agent2.setName("Agent Two");
        agent2.setEmail("agent2@lastmile.com");
        agent2.setRole(Role.DELIVERY_AGENT);
        agent2.setAvailable(true);

        warehouseStaff = new User();
        warehouseStaff.setId(5L);
        warehouseStaff.setName("Warehouse Staff");
        warehouseStaff.setEmail("warehouse@lastmile.com");
        warehouseStaff.setRole(Role.WAREHOUSE_STAFF);
        warehouseStaff.setAssignedZone(zoneNorth);

        customer1 = new User();
        customer1.setId(6L);
        customer1.setName("Customer Alice");
        customer1.setEmail("alice@gmail.com");
        customer1.setRole(Role.CUSTOMER);

        customer2 = new User();
        customer2.setId(7L);
        customer2.setName("Customer Bob");
        customer2.setEmail("bob@gmail.com");
        customer2.setRole(Role.CUSTOMER);

        order1 = new DeliveryOrder();
        order1.setId(100L);
        order1.setCustomer(customer1);
        order1.setDeliveryAgent(agent1);
        order1.setPickupZone(zoneNorth);
        order1.setDropZone(zoneSouth);
        order1.setPickupAddress("North Hub, 100 Main St");
        order1.setDropAddress("South Park, 200 Oak Ave");
        order1.setOrderType(OrderType.B2C);
        order1.setPaymentType(PaymentType.PREPAID);
        order1.setStatus(OrderStatus.PLACED);
        order1.setChargeableWeightKg(BigDecimal.valueOf(2.5));
        order1.setFinalCharge(BigDecimal.valueOf(150.00));
    }

    private void authenticate(User user) {
        var authorities = RbacConfig.getPermissions(user.getRole()).stream()
                .map(p -> new SimpleGrantedAuthority("PERM_" + p.name()))
                .toList();
        var fullAuthorities = new java.util.ArrayList<>(authorities);
        fullAuthorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

        var auth = new UsernamePasswordAuthenticationToken(user.getEmail(), null, fullAuthorities);
        SecurityContextHolder.getContext().setAuthentication(auth);

        lenient().when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
    }

    // 1. Role-Permission Matrix Verification
    @Test
    void rolePermissionsMatrixMatchesSpecification() {
        assertTrue(RbacConfig.hasPermission(Role.ADMIN, Permission.USER_MANAGE_ROLES));
        assertTrue(RbacConfig.hasPermission(Role.ADMIN, Permission.SYSTEM_SETTINGS_MANAGE));
        assertTrue(RbacConfig.hasPermission(Role.ADMIN, Permission.DELIVERY_ASSIGN));

        assertTrue(RbacConfig.hasPermission(Role.DISPATCHER, Permission.DELIVERY_ASSIGN));
        assertTrue(RbacConfig.hasPermission(Role.DISPATCHER, Permission.DELIVERY_AUTO_ASSIGN));
        assertTrue(RbacConfig.hasPermission(Role.DISPATCHER, Permission.PARTNER_APP_REVIEW));
        assertFalse(RbacConfig.hasPermission(Role.DISPATCHER, Permission.SYSTEM_SETTINGS_MANAGE));
        assertFalse(RbacConfig.hasPermission(Role.DISPATCHER, Permission.USER_MANAGE_ROLES));
        assertFalse(RbacConfig.hasPermission(Role.DISPATCHER, Permission.USER_DELETE));

        assertTrue(RbacConfig.hasPermission(Role.DELIVERY_AGENT, Permission.DELIVERY_STATUS_UPDATE));
        assertTrue(RbacConfig.hasPermission(Role.DELIVERY_AGENT, Permission.DELIVERY_LOCATION_UPDATE));
        assertTrue(RbacConfig.hasPermission(Role.DELIVERY_AGENT, Permission.PROOF_OF_DELIVERY_UPLOAD));
        assertFalse(RbacConfig.hasPermission(Role.DELIVERY_AGENT, Permission.DELIVERY_ASSIGN));
        assertFalse(RbacConfig.hasPermission(Role.DELIVERY_AGENT, Permission.ORDER_VIEW_ALL));

        assertTrue(RbacConfig.hasPermission(Role.WAREHOUSE_STAFF, Permission.PACKAGE_PROCESS));
        assertTrue(RbacConfig.hasPermission(Role.WAREHOUSE_STAFF, Permission.PACKAGE_HANDOVER));
        assertTrue(RbacConfig.hasPermission(Role.WAREHOUSE_STAFF, Permission.ORDER_VIEW_WAREHOUSE));
        assertFalse(RbacConfig.hasPermission(Role.WAREHOUSE_STAFF, Permission.DELIVERY_ASSIGN));

        assertTrue(RbacConfig.hasPermission(Role.CUSTOMER, Permission.ORDER_CREATE));
        assertTrue(RbacConfig.hasPermission(Role.CUSTOMER, Permission.ORDER_VIEW_OWN));
        assertTrue(RbacConfig.hasPermission(Role.CUSTOMER, Permission.PARTNER_APP_SUBMIT));
        assertFalse(RbacConfig.hasPermission(Role.CUSTOMER, Permission.DELIVERY_STATUS_UPDATE));
        assertFalse(RbacConfig.hasPermission(Role.CUSTOMER, Permission.DELIVERY_ASSIGN));
    }

    // 2. Admin Access
    @Test
    void adminCanAccessAllOrdersAndPermissions() {
        authenticate(admin);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));

        assertTrue(rbacEvaluator.hasPermission("DELIVERY_ASSIGN"));
        assertTrue(rbacEvaluator.hasPermission("SYSTEM_SETTINGS_MANAGE"));
        assertTrue(rbacEvaluator.canAccessOrder(100L));
        assertTrue(rbacEvaluator.canUpdateOrderStatus(100L, OrderStatus.DELIVERED));
    }

    // 3. Dispatcher Assignment
    @Test
    void dispatcherCanAssignDeliveries() {
        authenticate(dispatcher);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));
        when(userRepository.findById(3L)).thenReturn(Optional.of(agent1));

        OrderResponse response = orderService.assign(100L, 3L, dispatcher.getEmail());
        assertNotNull(response);
        assertEquals(3L, response.deliveryAgentId());
        verify(trackingRepository).save(any());
    }

    // 4. Delivery Agent Restrictions
    @Test
    void deliveryAgentCannotAssignDeliveries() {
        authenticate(agent1);
        assertFalse(rbacEvaluator.hasPermission("DELIVERY_ASSIGN"));
        assertFalse(rbacEvaluator.hasPermission("DELIVERY_AUTO_ASSIGN"));
    }

    @Test
    void deliveryAgentCanAccessAssignedOrderOnly() {
        authenticate(agent1);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));

        assertTrue(rbacEvaluator.canAccessOrder(100L));

        // When authenticated as agent2 (unassigned)
        authenticate(agent2);
        assertFalse(rbacEvaluator.canAccessOrder(100L));
    }

    @Test
    void agentCannotModifyAnotherAgentDelivery() {
        authenticate(agent2);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));

        StatusUpdateRequest request = new StatusUpdateRequest(OrderStatus.PICKED_UP, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> {
            orderService.transition(agent2.getEmail(), 100L, request);
        });
        assertTrue(ex.getMessage().contains("not the assigned delivery agent"));
    }

    @Test
    void assignedAgentCanBroadcastLocationAndUploadPod() {
        authenticate(agent1);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));
        when(orderRepository.save(any(DeliveryOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        LocationUpdateRequest locRequest = new LocationUpdateRequest(BigDecimal.valueOf(12.9716), BigDecimal.valueOf(77.5946));
        OrderResponse locResponse = orderService.updateLocation(agent1.getEmail(), 100L, locRequest);
        assertNotNull(locResponse);
        assertEquals(BigDecimal.valueOf(12.9716), locResponse.currentLatitude());

        ProofOfDeliveryRequest podRequest = new ProofOfDeliveryRequest("https://cdn.lastmile.com/pod100.png", "https://cdn.lastmile.com/sig100.png", "Alice", "Handed to recipient");
        OrderResponse podResponse = orderService.uploadProofOfDelivery(agent1.getEmail(), 100L, podRequest);
        assertNotNull(podResponse);
        assertEquals("https://cdn.lastmile.com/pod100.png", podResponse.podUrl());
    }

    // 5. Customer Restrictions & IDOR Prevention
    @Test
    void customerCanViewOnlyOwnOrders() {
        authenticate(customer1);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));
        assertTrue(rbacEvaluator.canAccessOrder(100L));

        // Customer2 attempts to access Customer1's order
        authenticate(customer2);
        assertFalse(rbacEvaluator.canAccessOrder(100L));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> {
            orderService.get(customer2.getEmail(), 100L);
        });
        assertTrue(ex.getMessage().contains("Not permitted"));
    }

    @Test
    void customerCannotDirectlyAdvanceDeliveryStatus() {
        authenticate(customer1);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));

        StatusUpdateRequest request = new StatusUpdateRequest(OrderStatus.DELIVERED, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () -> {
            orderService.transition(customer1.getEmail(), 100L, request);
        });
        assertTrue(ex.getMessage().contains("Customers cannot directly advance delivery status"));
    }

    // 6. Warehouse Staff Scoping
    @Test
    void warehouseStaffCanAccessOrdersInAssignedZone() {
        authenticate(warehouseStaff); // assigned to zoneNorth (pickupZone of order1)
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order1));

        assertTrue(rbacEvaluator.canAccessOrder(100L));

        // If warehouse staff was assigned to a third zone, access is denied
        Zone zoneEast = new Zone();
        zoneEast.setId(3L);
        warehouseStaff.setAssignedZone(zoneEast);

        assertFalse(rbacEvaluator.canAccessOrder(100L));
    }

    // 7. Privilege Escalation Prevention
    @Test
    void nonAdminCannotChangeUserRole() {
        authenticate(customer1);
        assertFalse(rbacEvaluator.canManageUserRole(6L, Role.ADMIN));

        authenticate(dispatcher);
        assertFalse(rbacEvaluator.canManageUserRole(6L, Role.ADMIN));

        authenticate(admin);
        assertTrue(rbacEvaluator.canManageUserRole(6L, Role.DELIVERY_AGENT));
    }

    @Test
    void adminCanChangeUserRoleSuccessfully() {
        authenticate(admin);
        when(userRepository.findById(6L)).thenReturn(Optional.of(customer1));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateRoleRequest request = new UpdateRoleRequest(Role.DISPATCHER, null);
        UserResponse response = userController.updateUserRole(
                new UsernamePasswordAuthenticationToken(admin.getEmail(), null),
                6L,
                request);

        assertNotNull(response);
        assertEquals(Role.DISPATCHER, response.role());
        assertEquals(Role.DISPATCHER, customer1.getRole());
    }
}
