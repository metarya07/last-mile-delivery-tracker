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
import com.lastmile.delivery.dto.request.LocationUpdateRequest;
import com.lastmile.delivery.dto.request.ProofOfDeliveryRequest;
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
import com.lastmile.delivery.entity.OrderType;
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
    private final AuditService auditService;

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
            DeliveryPartnerApplicationRepository partnerApplications,
            AuditService auditService) {

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
        this.auditService = auditService;
    }

    public OrderResponse create(
            String email,
            CreateOrderRequest request) {

        User actor = findUser(email);
        User customer = actor;

        // Admin or Dispatcher can create orders on behalf of a specific customer
        if ((actor.getRole() == Role.ADMIN || actor.getRole() == Role.DISPATCHER) && request.customerId() != null) {
            customer = users.findById(request.customerId())
                    .orElseThrow(() -> new IllegalArgumentException("Target customer not found with ID: " + request.customerId()));
        }

        Zone pickupZone = findZone(request.pickupZoneId());
        Zone dropZone = findZone(request.dropZoneId());

        BigDecimal volumetricWeight = calculateVolumetricWeight(request);
        BigDecimal chargeableWeight = request.actualWeightKg().max(volumetricWeight);

        BigDecimal baseCharge = calculateBaseCharge(chargeableWeight, pickupZone, dropZone, request.orderType());
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

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "ORDER_CREATED",
                "ORDER",
                order.getId().toString(),
                "Created order #" + order.getId() + " for customer #" + customer.getId());

        return mapToResponse(order);
    }

    public List<OrderResponse> mine(String email) {
        User user = findUser(email);

        if (user.getRole() == Role.DELIVERY_AGENT) {
            return orders.findByDeliveryAgentIdOrderByUpdatedAtDesc(user.getId())
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.DISPATCHER) {
            return orders.findAll()
                    .stream()
                    .map(this::mapToResponse)
                    .toList();
        }

        if (user.getRole() == Role.WAREHOUSE_STAFF) {
            if (user.getAssignedZone() == null) {
                return orders.findAll()
                        .stream()
                        .map(this::mapToResponse)
                        .toList();
            }
            Long zoneId = user.getAssignedZone().getId();
            return orders.findAll()
                    .stream()
                    .filter(o -> (o.getPickupZone() != null && o.getPickupZone().getId().equals(zoneId))
                            || (o.getDropZone() != null && o.getDropZone().getId().equals(zoneId)))
                    .map(this::mapToResponse)
                    .toList();
        }

        return orders.findByCustomerIdOrderByCreatedAtDesc(user.getId())
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
            throw new AccessDeniedException("Customers cannot directly advance delivery status");
        }

        boolean isOperationsManager = actor.getRole() == Role.ADMIN || actor.getRole() == Role.DISPATCHER;

        if (actor.getRole() == Role.DELIVERY_AGENT) {
            boolean assignedToActor = order.getDeliveryAgent() != null
                    && order.getDeliveryAgent().getId().equals(actor.getId());

            if (!assignedToActor) {
                throw new AccessDeniedException("You are not the assigned delivery agent for this order");
            }

            if (!isAllowedTransition(order.getStatus(), request.status())) {
                throw new IllegalArgumentException(
                        "Invalid status transition from " + order.getStatus() + " to " + request.status());
            }
        }

        if (actor.getRole() == Role.WAREHOUSE_STAFF) {
            if (request.status() != OrderStatus.PICKED_UP && request.status() != OrderStatus.IN_TRANSIT) {
                throw new AccessDeniedException("Warehouse staff can only advance orders to PICKED_UP or IN_TRANSIT");
            }
            if (userHasZoneAccess(actor, order) == false) {
                throw new AccessDeniedException("Order does not belong to your assigned warehouse zone");
            }
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(request.status());

        if (request.status() == OrderStatus.FAILED || request.status() == OrderStatus.DELIVERED) {
            DeliveryAttempt attempt = new DeliveryAttempt();
            attempt.setOrder(order);
            attempt.setDeliveryAgent(order.getDeliveryAgent() != null ? order.getDeliveryAgent() : actor);
            attempt.setAttemptNumber((int) attempts.countByOrderId(id) + 1);
            attempt.setStatus(request.status() == OrderStatus.DELIVERED ? AttemptStatus.DELIVERED : AttemptStatus.FAILED);
            attempt.setFailureReason(request.failureReason());
            attempts.save(attempt);
        }

        addTrackingHistory(order, actor);
        sendStatusNotification(order);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "DELIVERY_STATUS_CHANGED",
                "ORDER",
                order.getId().toString(),
                "Status transitioned from " + previousStatus + " to " + request.status());

        return mapToResponse(order);
    }

    public OrderResponse updateLocation(
            String email,
            Long id,
            LocationUpdateRequest request) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        if (actor.getRole() != Role.ADMIN) {
            boolean assigned = order.getDeliveryAgent() != null && order.getDeliveryAgent().getId().equals(actor.getId());
            if (!assigned) {
                throw new AccessDeniedException("Only the assigned delivery agent can broadcast live GPS coordinates");
            }
        }

        order.setCurrentLatitude(request.latitude());
        order.setCurrentLongitude(request.longitude());
        order = orders.save(order);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "DELIVERY_LOCATION_UPDATED",
                "ORDER",
                order.getId().toString(),
                "Updated GPS coordinates to lat=" + request.latitude() + ", lng=" + request.longitude());

        return mapToResponse(order);
    }

    public OrderResponse uploadProofOfDelivery(
            String email,
            Long id,
            ProofOfDeliveryRequest request) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        if (actor.getRole() != Role.ADMIN) {
            boolean assigned = order.getDeliveryAgent() != null && order.getDeliveryAgent().getId().equals(actor.getId());
            if (!assigned) {
                throw new AccessDeniedException("Only the assigned delivery agent can upload proof of delivery");
            }
        }

        order.setPodUrl(request.podUrl());
        order = orders.save(order);

        DeliveryAttempt attempt = new DeliveryAttempt();
        attempt.setOrder(order);
        attempt.setDeliveryAgent(order.getDeliveryAgent() != null ? order.getDeliveryAgent() : actor);
        attempt.setAttemptNumber((int) attempts.countByOrderId(id) + 1);
        attempt.setStatus(AttemptStatus.DELIVERED);
        attempt.setPodUrl(request.podUrl());
        attempt.setPodSignature(request.signatureUrl());
        attempt.setRecipientName(request.recipientName());
        attempt.setPodNotes(request.notes());
        attempts.save(attempt);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "PROOF_OF_DELIVERY_UPLOADED",
                "ORDER",
                order.getId().toString(),
                "Proof of delivery uploaded: " + request.podUrl());

        return mapToResponse(order);
    }

    public OrderResponse reschedule(
            Long id,
            String email,
            RescheduleOrderRequest request) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        boolean isOperationsManager = actor.getRole() == Role.ADMIN || actor.getRole() == Role.DISPATCHER;
        boolean isOwner = order.getCustomer().getId().equals(actor.getId());

        if (!isOperationsManager && !isOwner) {
            throw new AccessDeniedException("Not authorized to reschedule this order");
        }

        if (order.getStatus() != OrderStatus.FAILED) {
            throw new IllegalArgumentException("Only FAILED orders can be rescheduled for a new delivery attempt");
        }

        order.setStatus(OrderStatus.RESCHEDULED);
        order.setDeliveryAgent(null);
        order = orders.save(order);

        addTrackingHistory(order, actor);
        sendStatusNotification(order);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "ORDER_RESCHEDULED",
                "ORDER",
                order.getId().toString(),
                "Order rescheduled for a fresh delivery attempt");

        return mapToResponse(order);
    }

    public OrderResponse assign(
            Long id,
            Long agentId,
            String email) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        User agent = users.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Delivery agent not found"));

        if (agent.getRole() != Role.DELIVERY_AGENT) {
            throw new IllegalArgumentException("User is not a delivery agent");
        }

        if (!agent.isAvailable()) {
            throw new IllegalArgumentException("Delivery agent is currently offline / unavailable");
        }

        order.setDeliveryAgent(agent);
        addTrackingHistory(order, actor);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "DELIVERY_ASSIGNED",
                "ORDER",
                order.getId().toString(),
                "Assigned order #" + order.getId() + " to agent #" + agent.getId() + " (" + agent.getName() + ")");

        return mapToResponse(order);
    }

    public OrderResponse autoAssign(
            Long id,
            String email) {

        DeliveryOrder order = findOrder(id);
        User actor = findUser(email);

        List<User> availableAgents = users.findByRoleAndAvailableTrue(Role.DELIVERY_AGENT);

        if (availableAgents.isEmpty()) {
            throw new IllegalArgumentException("No online delivery agents currently available in the fleet for auto-assignment");
        }

        String pickupZoneName = order.getPickupZone().getName().toLowerCase();

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
                    return orders.findByDeliveryAgentIdOrderByUpdatedAtDesc(agent.getId()).stream()
                            .filter(o -> o.getStatus() != OrderStatus.DELIVERED && o.getStatus() != OrderStatus.FAILED)
                            .count();
                }))
                .orElseThrow(() -> new IllegalArgumentException("No suitable delivery agent found"));

        order.setDeliveryAgent(bestAgent);
        addTrackingHistory(order, actor);

        auditService.logSuccess(
                actor.getId(),
                actor.getEmail(),
                actor.getRole().name(),
                "DELIVERY_AUTO_ASSIGNED",
                "ORDER",
                order.getId().toString(),
                "Auto-assigned order #" + order.getId() + " to agent #" + bestAgent.getId() + " (" + bestAgent.getName() + ")");

        return mapToResponse(order);
    }

    public List<TrackingHistoryResponse> getTrackingHistory(
            String email,
            Long id) {
        DeliveryOrder order = findOrder(id);
        verifyOrderAccess(email, order);

        return tracking.findByOrderIdOrderByCreatedAtAsc(id)
                .stream()
                .map(history -> new TrackingHistoryResponse(
                        history.getId(),
                        history.getOrder().getId(),
                        history.getStatus(),
                        history.getActor() == null ? null : history.getActor().getId(),
                        history.getActor() == null ? null : history.getActor().getName(),
                        history.getCreatedAt()))
                .toList();
    }

    public List<DeliveryAttemptResponse> getDeliveryAttempts(
            String email,
            Long id) {
        DeliveryOrder order = findOrder(id);
        verifyOrderAccess(email, order);

        return attempts.findByOrderIdOrderByAttemptedAtDesc(id)
                .stream()
                .map(this::mapToDeliveryAttemptResponse)
                .toList();
    }

    private void sendStatusNotification(DeliveryOrder order) {
        User customer = order.getCustomer();
        if (customer == null) {
            return;
        }

        OrderStatus status = order.getStatus();
        String subject = "Order #" + order.getId() + " status update: " + status;
        String message = buildStatusMessage(order.getId(), status);

        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            try {
                emailService.sendEmail(customer.getEmail(), subject, message);
            } catch (Exception ex) {
                System.err.println("Email notification failed: " + ex.getMessage());
            }
        }

        if (smsService != null && customer.getPhone() != null && !customer.getPhone().isBlank()) {
            try {
                smsService.sendSms(customer.getPhone(), message);
            } catch (Exception ex) {
                System.err.println("SMS notification skipped/failed: " + ex.getMessage());
            }
        }
    }

    private String buildStatusMessage(Long orderId, OrderStatus status) {
        return switch (status) {
            case PLACED -> "Your delivery order #" + orderId + " has been placed successfully.";
            case PICKED_UP -> "Your order #" + orderId + " has been picked up by our delivery partner.";
            case IN_TRANSIT -> "Your order #" + orderId + " is now in transit to the destination.";
            case OUT_FOR_DELIVERY -> "Your order #" + orderId + " is out for delivery today.";
            case DELIVERED -> "Your order #" + orderId + " has been delivered successfully. Thank you!";
            case FAILED -> "Delivery attempt for order #" + orderId + " was unsuccessful. Please visit the customer portal to reschedule.";
            case RESCHEDULED -> "Your order #" + orderId + " has been rescheduled for another delivery attempt.";
            default -> "The status of your order #" + orderId + " has been updated to " + status + ".";
        };
    }

    private DeliveryAttemptResponse mapToDeliveryAttemptResponse(DeliveryAttempt attempt) {
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

    private BigDecimal calculateVolumetricWeight(CreateOrderRequest request) {
        return request.lengthCm()
                .multiply(request.widthCm())
                .multiply(request.heightCm())
                .divide(BigDecimal.valueOf(5000), 3, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateBaseCharge(BigDecimal chargeableWeight, Zone pickupZone, Zone dropZone, OrderType orderType) {
        var optionalRateCard = (pickupZone.getId() != null && dropZone.getId() != null)
                ? rates.findByPickupZoneIdAndDropZoneIdAndOrderType(pickupZone.getId(), dropZone.getId(), orderType)
                : java.util.Optional.<RateCard>empty();

        if (optionalRateCard.isPresent()) {
            RateCard rateCard = optionalRateCard.get();
            return chargeableWeight
                    .multiply(rateCard.getRatePerKg())
                    .max(rateCard.getMinimumCharge())
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // Dynamic fallback rate
        boolean isIntraZone = pickupZone.getId() != null && pickupZone.getId().equals(dropZone.getId());
        BigDecimal ratePerKg = orderType == OrderType.B2B
                ? (isIntraZone ? BigDecimal.valueOf(30) : BigDecimal.valueOf(45))
                : (isIntraZone ? BigDecimal.valueOf(40) : BigDecimal.valueOf(55));
        BigDecimal minCharge = orderType == OrderType.B2B
                ? (isIntraZone ? BigDecimal.valueOf(70) : BigDecimal.valueOf(100))
                : (isIntraZone ? BigDecimal.valueOf(50) : BigDecimal.valueOf(80));

        return chargeableWeight
                .multiply(ratePerKg)
                .max(minCharge)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateCodSurcharge(CreateOrderRequest request) {
        if (request.paymentType() != PaymentType.COD) {
            return BigDecimal.ZERO;
        }
        return cod.findByOrderType(request.orderType())
                .map(CodCharge::getSurcharge)
                .orElse(request.orderType() == OrderType.B2B ? BigDecimal.valueOf(40) : BigDecimal.valueOf(25));
    }

    private boolean isAllowedTransition(OrderStatus currentStatus, OrderStatus newStatus) {
        return switch (currentStatus) {
            case PLACED -> newStatus == OrderStatus.PICKED_UP;
            case RESCHEDULED -> newStatus == OrderStatus.OUT_FOR_DELIVERY;
            case PICKED_UP -> newStatus == OrderStatus.IN_TRANSIT;
            case IN_TRANSIT -> newStatus == OrderStatus.OUT_FOR_DELIVERY;
            case OUT_FOR_DELIVERY -> newStatus == OrderStatus.DELIVERED || newStatus == OrderStatus.FAILED;
            case FAILED -> newStatus == OrderStatus.RESCHEDULED;
            default -> false;
        };
    }

    private void addTrackingHistory(DeliveryOrder order, User actor) {
        OrderTrackingHistory history = new OrderTrackingHistory();
        history.setOrder(order);
        history.setActor(actor);
        history.setStatus(order.getStatus());
        tracking.save(history);
    }

    private boolean userHasZoneAccess(User user, DeliveryOrder order) {
        if (user.getAssignedZone() == null) {
            return true;
        }
        Long zoneId = user.getAssignedZone().getId();
        return (order.getPickupZone() != null && order.getPickupZone().getId().equals(zoneId))
                || (order.getDropZone() != null && order.getDropZone().getId().equals(zoneId));
    }

    private void verifyOrderAccess(String email, DeliveryOrder order) {
        User user = findUser(email);
        boolean isOperationsManager = user.getRole() == Role.ADMIN || user.getRole() == Role.DISPATCHER;
        boolean isCustomer = order.getCustomer().getId().equals(user.getId());
        boolean isAssignedAgent = order.getDeliveryAgent() != null && order.getDeliveryAgent().getId().equals(user.getId());
        boolean isWarehouseStaff = user.getRole() == Role.WAREHOUSE_STAFF && userHasZoneAccess(user, order);

        if (!isOperationsManager && !isCustomer && !isAssignedAgent && !isWarehouseStaff) {
            throw new AccessDeniedException("Not permitted to access order #" + order.getId());
        }
    }

    private User findUser(String email) {
        return users.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Zone findZone(Long id) {
        if (id == null) {
            return zones.findAll().stream().findFirst().orElseGet(() -> {
                Zone z = new Zone();
                z.setName("North Zone");
                return zones.save(z);
            });
        }
        return zones.findById(id)
                .orElseGet(() -> zones.findAll().stream().findFirst().orElseGet(() -> {
                    Zone z = new Zone();
                    z.setName("North Zone");
                    return zones.save(z);
                }));
    }

    private DeliveryOrder findOrder(Long id) {
        return orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
    }

    private OrderResponse mapToResponse(DeliveryOrder order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomer().getId(),
                order.getDeliveryAgent() == null ? null : order.getDeliveryAgent().getId(),
                order.getPickupAddress(),
                order.getDropAddress(),
                order.getPickupZone().getName(),
                order.getDropZone().getName(),
                order.getOrderType(),
                order.getPaymentType(),
                order.getStatus(),
                order.getChargeableWeightKg(),
                order.getFinalCharge(),
                order.getCreatedAt(),
                order.getCurrentLatitude(),
                order.getCurrentLongitude(),
                order.getPodUrl());
    }
}