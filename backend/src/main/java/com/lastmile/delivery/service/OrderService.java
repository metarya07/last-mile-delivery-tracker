package com.lastmile.delivery.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lastmile.delivery.dto.request.CreateOrderRequest;
import com.lastmile.delivery.dto.request.StatusUpdateRequest;
import com.lastmile.delivery.dto.response.DeliveryAttemptResponse;
import com.lastmile.delivery.dto.response.OrderResponse;
import com.lastmile.delivery.dto.response.TrackingHistoryResponse;
import com.lastmile.delivery.entity.AttemptStatus;
import com.lastmile.delivery.entity.CodCharge;
import com.lastmile.delivery.entity.DeliveryAttempt;
import com.lastmile.delivery.entity.DeliveryOrder;
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

        public OrderService(
                        DeliveryOrderRepository orders,
                        UserRepository users,
                        ZoneRepository zones,
                        RateCardRepository rates,
                        CodChargeRepository cod,
                        OrderTrackingHistoryRepository tracking,
                        DeliveryAttemptRepository attempts,
                        EmailService emailService) {

                this.orders = orders;
                this.users = users;
                this.zones = zones;
                this.rates = rates;
                this.cod = cod;
                this.tracking = tracking;
                this.attempts = attempts;
                this.emailService = emailService;
        }

        public OrderResponse create(
                        String email,
                        CreateOrderRequest request) {

                User customer = findUser(email);

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
                                                "No rate card for the selected zones and order type"));

                BigDecimal baseCharge = calculateBaseCharge(chargeableWeight, rateCard);

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

                addTrackingHistory(order, customer);

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
                                        "Customers cannot update order status");
                }

                if (actor.getRole() == Role.DELIVERY_AGENT) {

                        boolean assignedToActor = order.getDeliveryAgent() != null
                                        && order.getDeliveryAgent()
                                                        .getId()
                                                        .equals(actor.getId());

                        if (!assignedToActor) {
                                throw new AccessDeniedException(
                                                "Not assigned");
                        }
                }

                if (!isAllowedTransition(
                                order.getStatus(),
                                request.status())) {

                        throw new IllegalArgumentException(
                                        "Invalid status transition");
                }

                order.setStatus(request.status());

                if (request.status() == OrderStatus.FAILED
                                || request.status() == OrderStatus.DELIVERED) {

                        DeliveryAttempt attempt = new DeliveryAttempt();

                        attempt.setOrder(order);
                        attempt.setDeliveryAgent(actor);

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
                                        "Delivery agent is not available");
                }

                order.setDeliveryAgent(agent);

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

                if (customer == null
                                || customer.getEmail() == null
                                || customer.getEmail().isBlank()) {
                        return;
                }

                OrderStatus status = order.getStatus();

                String subject = "Order #" + order.getId()
                                + " status update: "
                                + status;

                String message = buildStatusMessage(
                                order.getId(),
                                status);

                emailService.sendEmail(
                                customer.getEmail(),
                                subject,
                                message);
        }

        private String buildStatusMessage(
                        Long orderId,
                        OrderStatus status) {

                return switch (status) {

                        case PICKED_UP ->
                                "Your order #" + orderId
                                                + " has been picked up.";

                        case IN_TRANSIT ->
                                "Your order #" + orderId
                                                + " is now in transit.";

                        case OUT_FOR_DELIVERY ->
                                "Your order #" + orderId
                                                + " is out for delivery.";

                        case DELIVERED ->
                                "Your order #" + orderId
                                                + " has been delivered.";

                        case FAILED ->
                                "Delivery of your order #" + orderId
                                                + " was unsuccessful.";

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

                        case PLACED, RESCHEDULED ->
                                newStatus == OrderStatus.PICKED_UP;

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