package com.lastmile.delivery.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lastmile.delivery.dto.request.CreateOrderRequest;
import com.lastmile.delivery.dto.request.RescheduleOrderRequest;
import com.lastmile.delivery.dto.request.StatusUpdateRequest;
import com.lastmile.delivery.dto.response.DeliveryAttemptResponse;
import com.lastmile.delivery.dto.response.OrderResponse;
import com.lastmile.delivery.dto.response.TrackingHistoryResponse;
import com.lastmile.delivery.entity.ApplicationStatus;
import com.lastmile.delivery.entity.AttemptStatus;
import com.lastmile.delivery.entity.CodCharge;
import com.lastmile.delivery.entity.DeliveryAttempt;
import com.lastmile.delivery.entity.DeliveryOrder;
import com.lastmile.delivery.entity.DeliveryPartnerApplication;
import com.lastmile.delivery.entity.OrderStatus;
import com.lastmile.delivery.entity.OrderTrackingHistory;
import com.lastmile.delivery.entity.PaymentType;
import com.lastmile.delivery.entity.RateCard;
import com.lastmile.delivery.entity.Role;
import com.lastmile.delivery.entity.User;
import com.lastmile.delivery.entity.Zone;
import com.lastmile.delivery.repository.CodChargeRepository;
import com.lastmile.delivery.repository.DeliveryAttemptRepository;
import com.lastmile.delivery.repository.DeliveryOrderRepository;
import com.lastmile.delivery.repository.DeliveryPartnerApplicationRepository;
import com.lastmile.delivery.repository.OrderTrackingHistoryRepository;
import com.lastmile.delivery.repository.RateCardRepository;
import com.lastmile.delivery.repository.UserRepository;
import com.lastmile.delivery.repository.ZoneRepository;

@Service
@Transactional
public class OrderService {

    private final DeliveryOrderRepository orders;
    private final UserRepository users;
    private final ZoneRepository zones;
    private final RateCardRepository rates;
    private final CodChargeRepository cod;
    private final OrderTrackingHistoryRepository tracking;
    private final DeliveryAttemptRepository attempts;
    private final EmailService emailService;
    private final SmsService smsService;
    private final DeliveryPartnerApplicationRepository partnerApplications;

    public OrderService(
            DeliveryOrderRepository orders,
            UserRepository users,
            ZoneRepository zones,
            RateCardRepository rates,
            CodChargeRepository cod,
            OrderTrackingHistoryRepository tracking,
            DeliveryAttemptRepository attempts,
            EmailService emailService,
            @Autowired(required = false) SmsService smsService,
            DeliveryPartnerApplicationRepository partnerApplications) {

        this.orders = orders;
        this.users = users;
        this.zones = zones;
        this.rates = rates;
        this.cod = cod;
        this.tracking = tracking;
        this.attempts = attempts;
        this.emailService = emailService;
        this.smsService = smsService;
        this.partnerApplications = partnerApplications;
    }

    public OrderResponse create(
            String email,
            CreateOrderRequest request) {

        User actor = findUser(email);
        User customer = actor;

        // Admin can create orders on behalf of a specific customer
        if (actor.getRole() == Role.ADMIN && request.customerId() != null) {
            customer = users.findById(request.customerId())
                    .orElseThrow(() -> new IllegalArgumentException("Target customer not found with ID: " + request.customerId()));
        }

        Zone pickupZone = findZone(request.pickupZoneId());
        Zone dropZone = findZone(request.dropZoneId());

        BigDecimal volumetricWeight = calculateVolumetricWeight(request);
        BigDecimal chargeableWeight = request.actualWeightKg().max(volumetricWeight);

        RateCard rateCard = rates
                .findByPickupZoneIdAndDropZoneIdAndOrderType(
                        pickupZone.getId(),
                        dropZone.getId(),
                        request.orderType())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No rate card for " + pickupZone.getName() + " -> " + dropZone.getName() + " (" + request.orderType() + ")"));

        BigDecimal baseCharge = calculateBaseCharge(
                chargeableWeight,
                rateCard);

        BigDecimal codSurcharge = calculateCodSurcharge(request);

        DeliveryOrder order = new DeliveryOrder();

        order.setCustomer(customer);
        order.setPickupAddress(request.pickupAddress());
        order.setDropAddress(request.dropAddress());

        order.setPickupZone(pickupZone);
        order.setDropZone(dropZone);

        order.setLengthCm(request.lengthCm());
        order.setWidthCm(request.widthCm());
        order.setHeightCm(request.heightCm());

        order.setActualWeightKg(request.actualWeightKg());
        order.setVolumetricWeightKg(volumetricWeight);
        order.setChargeableWeightKg(chargeableWeight);

        order.setOrderType(request.orderType());
        order.setPaymentType(request.paymentType());

        order.setBaseCharge(baseCharge);
        order.setCodSurcharge(codSurcharge);
        order.setFinalCharge(baseCharge.add(codSurcharge));

        order.setStatus(OrderStatus.PLACED);

        order = orders.save(order);

        addTrackingHistory(order, actor);

        sendStatusNotification(order);

        return mapToResponse(order);
    }

    public List<OrderResponse> mine(String email) {

        User user = findUser(email);

        if (user.getRole() == Role.DELIVERY_AGENT) {
            return orders
                    .findByDeliveryAgentIdOrderByUpdatedAtDesc(user.getId())
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        if (user.getRole() == Role.ADMIN) {
            return orders.findAll()
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        return orders
                .findByCustomerIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public OrderResponse get(
            String email,
            Long id) {

        DeliveryOrder order = findOrder(id);

        verifyOrderAccess(email, order);

        return mapToResponse(order);
    }

    public OrderResponse transition(
            String email,
            Long id,
            StatusUpdateRequest request) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        if (actor.getRole() == Role.CUSTOMER) {
            throw new AccessDeniedException(
                    "Customers cannot directly advance delivery status");
        }

        boolean isAdmin = actor.getRole() == Role.ADMIN;

        if (actor.getRole() == Role.DELIVERY_AGENT) {
            boolean assignedToActor = order.getDeliveryAgent() != null
                    && order.getDeliveryAgent()
                            .getId()
                            .equals(actor.getId());

            if (!assignedToActor) {
                throw new AccessDeniedException(
                        "You are not the assigned delivery agent for this order");
            }

            if (!isAllowedTransition(
                    order.getStatus(),
                    request.status())) {

                throw new IllegalArgumentException(
                        "Invalid status transition from " + order.getStatus() + " to " + request.status());
            }
        }

        // Admin override or valid agent transition
        order.setStatus(request.status());

        if (request.status() == OrderStatus.FAILED
                || request.status() == OrderStatus.DELIVERED) {

            DeliveryAttempt attempt = new DeliveryAttempt();

            attempt.setOrder(order);
            attempt.setDeliveryAgent(order.getDeliveryAgent() != null ? order.getDeliveryAgent() : actor);

            attempt.setAttemptNumber(
                    (int) attempts.countByOrderId(id) + 1);

            attempt.setStatus(
                    request.status() == OrderStatus.DELIVERED
                            ? AttemptStatus.DELIVERED
                            : AttemptStatus.FAILED);

            attempt.setFailureReason(
                    request.failureReason());

            attempts.save(attempt);
        }

        addTrackingHistory(order, actor);

        sendStatusNotification(order);

        return mapToResponse(order);
    }

    public OrderResponse reschedule(
            Long id,
            String email,
            RescheduleOrderRequest request) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        boolean isAdmin = actor.getRole() == Role.ADMIN;
        boolean isOwner = order.getCustomer().getId().equals(actor.getId());

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("Not authorized to reschedule this order");
        }

        if (order.getStatus() != OrderStatus.FAILED) {
            throw new IllegalArgumentException("Only FAILED orders can be rescheduled for a new delivery attempt");
        }

        order.setStatus(OrderStatus.RESCHEDULED);
        // Unassign previous agent so order can be reassigned for the new attempt
        order.setDeliveryAgent(null);

        order = orders.save(order);

        addTrackingHistory(order, actor);

        sendStatusNotification(order);

        return mapToResponse(order);
    }

    public OrderResponse assign(
            Long id,
            Long agentId,
            String email) {

        DeliveryOrder order = findOrder(id);

        User agent = users
                .findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Delivery agent not found"));

        if (agent.getRole() != Role.DELIVERY_AGENT) {
            throw new IllegalArgumentException(
                    "User is not a delivery agent");
        }

        if (!agent.isAvailable()) {
            throw new IllegalArgumentException(
                    "Delivery agent is currently offline / unavailable");
        }

        order.setDeliveryAgent(agent);

        addTrackingHistory(
                order,
                findUser(email));

        return mapToResponse(order);
    }

    // Auto-assignment logic: detect nearest/best available agent based on pickup zone & workload
    public OrderResponse autoAssign(
            Long id,
            String email) {

        DeliveryOrder order = findOrder(id);

        List<User> availableAgents = users.findByRoleAndAvailableTrue(Role.DELIVERY_AGENT);

        if (availableAgents.isEmpty()) {
            throw new IllegalArgumentException("No online delivery agents currently available in the fleet for auto-assignment");
        }

        String pickupZoneName = order.getPickupZone().getName().toLowerCase();

        // Score agents: matching preferred area scores highest, then tie-break by least active workload
        User bestAgent = availableAgents.stream()
                .min(Comparator.comparingInt((User agent) -> {
                    Optional<DeliveryPartnerApplication> app = partnerApplications.findTopByApplicantIdOrderByCreatedAtDesc(agent.getId());
                    boolean zoneMatch = app.isPresent()
                            && app.get().getStatus() == ApplicationStatus.APPROVED
                            && app.get().getPreferredArea() != null
                            && (app.get().getPreferredArea().toLowerCase().contains(pickupZoneName)
                                    || pickupZoneName.contains(app.get().getPreferredArea().toLowerCase())
                                    || app.get().getPreferredArea().equalsIgnoreCase("All Zones"));

                    return zoneMatch ? 0 : 1;
                }).thenComparingLong(agent -> {
                    // Count active (non-delivered, non-failed) deliveries currently assigned to agent
                    return orders.findByDeliveryAgentIdOrderByUpdatedAtDesc(agent.getId()).stream()
                            .filter(o -> o.getStatus() != OrderStatus.DELIVERED && o.getStatus() != OrderStatus.FAILED)
                            .count();
                }))
                .orElseThrow(() -> new IllegalArgumentException("No suitable delivery agent found"));

        order.setDeliveryAgent(bestAgent);

        addTrackingHistory(
                order,
                findUser(email));

        return mapToResponse(order);
    }

    public List<TrackingHistoryResponse> getTrackingHistory(
            String email,
            Long id) {

        DeliveryOrder order = findOrder(id);

        verifyOrderAccess(email, order);

        return tracking
                .findByOrderIdOrderByCreatedAtAsc(id)
                .stream()
                .map(history -> new TrackingHistoryResponse(
                        history.getId(),
                        history.getOrder().getId(),
                        history.getStatus(),
                        history.getActor() == null
                                ? null
                                : history.getActor().getId(),
                        history.getActor() == null
                                ? null
                                : history.getActor().getName(),
                        history.getCreatedAt()))
                .toList();
    }

    public List<DeliveryAttemptResponse> getDeliveryAttempts(
            String email,
            Long id) {

        DeliveryOrder order = findOrder(id);

        verifyOrderAccess(email, order);

        return attempts
                .findByOrderIdOrderByAttemptedAtDesc(id)
                .stream()
                .map(this::mapToDeliveryAttemptResponse)
                .toList();
    }

    private void sendStatusNotification(
            DeliveryOrder order) {

        User customer = order.getCustomer();

        if (customer == null) {
            return;
        }

        OrderStatus status = order.getStatus();

        String subject = "Order #" + order.getId()
                + " status update: "
                + status;

        String message = buildStatusMessage(
                order.getId(),
                status);

        // 1. Email notification
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            try {
                emailService.sendEmail(
                        customer.getEmail(),
                        subject,
                        message);
            } catch (Exception ex) {
                System.err.println("Email notification failed: " + ex.getMessage());
            }
        }

        // 2. SMS notification
        if (smsService != null && customer.getPhone() != null && !customer.getPhone().isBlank()) {
            try {
                smsService.sendSms(customer.getPhone(), message);
            } catch (Exception ex) {
                System.err.println("SMS notification skipped/failed: " + ex.getMessage());
            }
        }
    }

    private String buildStatusMessage(
            Long orderId,
            OrderStatus status) {

        return switch (status) {

            case PLACED ->
                "Your delivery order #" + orderId
                        + " has been placed successfully.";

            case PICKED_UP ->
                "Your order #" + orderId
                        + " has been picked up by our delivery partner.";

            case IN_TRANSIT ->
                "Your order #" + orderId
                        + " is now in transit to the destination.";

            case OUT_FOR_DELIVERY ->
                "Your order #" + orderId
                        + " is out for delivery today.";

            case DELIVERED ->
                "Your order #" + orderId
                        + " has been delivered successfully. Thank you!";

            case FAILED ->
                "Delivery attempt for order #" + orderId
                        + " was unsuccessful. Please visit the customer portal to reschedule.";

            case RESCHEDULED ->
                "Your order #" + orderId
                        + " has been rescheduled for another delivery attempt.";

            default ->
                "The status of your order #" + orderId
                        + " has been updated to "
                        + status + ".";
        };
    }

    private DeliveryAttemptResponse mapToDeliveryAttemptResponse(
            DeliveryAttempt attempt) {

        User agent = attempt.getDeliveryAgent();

        return new DeliveryAttemptResponse(
                attempt.getId(),
                attempt.getOrder().getId(),
                agent == null ? null : agent.getId(),
                agent == null ? null : agent.getName(),
                attempt.getAttemptNumber(),
                attempt.getStatus(),
                attempt.getFailureReason(),
                attempt.getAttemptedAt());
    }

    private BigDecimal calculateVolumetricWeight(
            CreateOrderRequest request) {

        return request.lengthCm()
                .multiply(request.widthCm())
                .multiply(request.heightCm())
                .divide(
                        BigDecimal.valueOf(5000),
                        3,
                        RoundingMode.HALF_UP);
    }

    private BigDecimal calculateBaseCharge(
            BigDecimal chargeableWeight,
            RateCard rateCard) {

        return chargeableWeight
                .multiply(rateCard.getRatePerKg())
                .max(rateCard.getMinimumCharge())
                .setScale(
                        2,
                        RoundingMode.HALF_UP);
    }

    private BigDecimal calculateCodSurcharge(
            CreateOrderRequest request) {

        if (request.paymentType() != PaymentType.COD) {
            return BigDecimal.ZERO;
        }

        return cod
                .findByOrderType(request.orderType())
                .map(CodCharge::getSurcharge)
                .orElse(BigDecimal.ZERO);
    }

    private boolean isAllowedTransition(
            OrderStatus currentStatus,
            OrderStatus newStatus) {

        return switch (currentStatus) {

            case PLACED ->
                newStatus == OrderStatus.PICKED_UP;

            case RESCHEDULED ->
                newStatus == OrderStatus.OUT_FOR_DELIVERY;

            case PICKED_UP ->
                newStatus == OrderStatus.IN_TRANSIT;

            case IN_TRANSIT ->
                newStatus == OrderStatus.OUT_FOR_DELIVERY;

            case OUT_FOR_DELIVERY ->
                newStatus == OrderStatus.DELIVERED
                        || newStatus == OrderStatus.FAILED;

            case FAILED ->
                newStatus == OrderStatus.RESCHEDULED;

            default ->
                false;
        };
    }

    private void addTrackingHistory(
            DeliveryOrder order,
            User actor) {

        OrderTrackingHistory history = new OrderTrackingHistory();

        history.setOrder(order);
        history.setActor(actor);
        history.setStatus(order.getStatus());

        tracking.save(history);
    }

    private void verifyOrderAccess(
            String email,
            DeliveryOrder order) {

        User user = findUser(email);

        boolean isAdmin = user.getRole() == Role.ADMIN;

        boolean isCustomer = order.getCustomer()
                .getId()
                .equals(user.getId());

        boolean isAssignedAgent = order.getDeliveryAgent() != null
                && order.getDeliveryAgent()
                        .getId()
                        .equals(user.getId());

        if (!isAdmin
                && !isCustomer
                && !isAssignedAgent) {

            throw new AccessDeniedException(
                    "Not permitted");
        }
    }

    private User findUser(String email) {

        return users
                .findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "User not found"));
    }

    private Zone findZone(Long id) {

        return zones
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Zone not found"));
    }

    private DeliveryOrder findOrder(Long id) {

        return orders
                .findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Order not found"));
    }

    private OrderResponse mapToResponse(
            DeliveryOrder order) {

        return new OrderResponse(
                order.getId(),
                order.getCustomer().getId(),
                order.getDeliveryAgent() == null
                        ? null
                        : order.getDeliveryAgent().getId(),
                order.getPickupAddress(),
                order.getDropAddress(),
                order.getPickupZone().getName(),
                order.getDropZone().getName(),
                order.getOrderType(),
                order.getPaymentType(),
                order.getStatus(),
                order.getChargeableWeightKg(),
                order.getFinalCharge(),
                order.getCreatedAt());
    }
}