package com.lastmile.delivery.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import com.lastmile.delivery.entity.CodCharge;
import com.lastmile.delivery.entity.OrderType;
import com.lastmile.delivery.entity.PaymentType;
import com.lastmile.delivery.entity.RateCard;
import com.lastmile.delivery.entity.Zone;
import com.lastmile.delivery.entity.ZoneArea;
import com.lastmile.delivery.repository.CodChargeRepository;
import com.lastmile.delivery.repository.RateCardRepository;
import com.lastmile.delivery.repository.ZoneAreaRepository;
import com.lastmile.delivery.repository.ZoneRepository;

@Service
@Transactional
public class RateConfigService {

    private final ZoneRepository zoneRepository;
    private final ZoneAreaRepository zoneAreaRepository;
    private final RateCardRepository rateCardRepository;
    private final CodChargeRepository codChargeRepository;

    public RateConfigService(
            ZoneRepository zoneRepository,
            ZoneAreaRepository zoneAreaRepository,
            RateCardRepository rateCardRepository,
            CodChargeRepository codChargeRepository) {

        this.zoneRepository = zoneRepository;
        this.zoneAreaRepository = zoneAreaRepository;
        this.rateCardRepository = rateCardRepository;
        this.codChargeRepository = codChargeRepository;
    }

    // Rate Calculation Engine (Pre-booking estimation)
    @Transactional(readOnly = true)
    public RateEstimateResponse estimate(RateEstimateRequest request) {
        Zone pickupZone = zoneRepository.findById(request.pickupZoneId())
                .orElseGet(() -> zoneRepository.findAll().stream().findFirst()
                        .orElseGet(() -> {
                            Zone z = new Zone();
                            z.setName("North Zone");
                            return z;
                        }));
        Zone dropZone = zoneRepository.findById(request.dropZoneId())
                .orElseGet(() -> zoneRepository.findAll().stream().skip(1).findFirst()
                        .orElse(pickupZone));

        // Volumetric weight: (L * W * H) / 5000
        BigDecimal volumetricWeight = request.lengthCm()
                .multiply(request.widthCm())
                .multiply(request.heightCm())
                .divide(BigDecimal.valueOf(5000), 3, RoundingMode.HALF_UP);

        // Bill on higher of actual vs volumetric weight
        BigDecimal chargeableWeight = request.actualWeightKg().max(volumetricWeight);

        // Rate card lookup with dynamic fallback
        BigDecimal ratePerKg;
        BigDecimal minCharge;

        var optionalRateCard = (pickupZone.getId() != null && dropZone.getId() != null)
                ? rateCardRepository.findByPickupZoneIdAndDropZoneIdAndOrderType(
                        pickupZone.getId(),
                        dropZone.getId(),
                        request.orderType())
                : java.util.Optional.<RateCard>empty();

        if (optionalRateCard.isPresent()) {
            ratePerKg = optionalRateCard.get().getRatePerKg();
            minCharge = optionalRateCard.get().getMinimumCharge();
        } else {
            boolean isIntraZone = pickupZone.getId() != null && pickupZone.getId().equals(dropZone.getId());
            if (request.orderType() == OrderType.B2B) {
                ratePerKg = isIntraZone ? BigDecimal.valueOf(30) : BigDecimal.valueOf(45);
                minCharge = isIntraZone ? BigDecimal.valueOf(70) : BigDecimal.valueOf(100);
            } else {
                ratePerKg = isIntraZone ? BigDecimal.valueOf(40) : BigDecimal.valueOf(55);
                minCharge = isIntraZone ? BigDecimal.valueOf(50) : BigDecimal.valueOf(80);
            }
        }

        // Base charge calculation: chargeableWeight * ratePerKg (minimum charge enforced)
        BigDecimal baseCharge = chargeableWeight
                .multiply(ratePerKg)
                .max(minCharge)
                .setScale(2, RoundingMode.HALF_UP);

        // COD surcharge calculation per order type
        BigDecimal codSurcharge = BigDecimal.ZERO;
        if (request.paymentType() == PaymentType.COD) {
            codSurcharge = codChargeRepository.findByOrderType(request.orderType())
                    .map(CodCharge::getSurcharge)
                    .orElse(request.orderType() == OrderType.B2B ? BigDecimal.valueOf(40) : BigDecimal.valueOf(25));
        }

        BigDecimal finalCharge = baseCharge.add(codSurcharge);

        return new RateEstimateResponse(
                request.actualWeightKg(),
                volumetricWeight,
                chargeableWeight,
                ratePerKg,
                minCharge,
                baseCharge,
                codSurcharge,
                finalCharge,
                pickupZone.getName() != null ? pickupZone.getName() : "Standard Zone",
                dropZone.getName() != null ? dropZone.getName() : "Standard Zone",
                request.orderType(),
                request.paymentType());
    }

    // Zone Management
    @Transactional(readOnly = true)
    public List<ZoneResponse> getAllZones() {
        return zoneRepository.findAll().stream().map(zone -> {
            List<ZoneAreaResponse> areas = zoneAreaRepository.findByZoneId(zone.getId()).stream()
                    .map(area -> new ZoneAreaResponse(area.getId(), zone.getId(), area.getAreaName()))
                    .toList();
            return new ZoneResponse(zone.getId(), zone.getName(), areas);
        }).toList();
    }

    public ZoneResponse createZone(CreateZoneRequest request) {
        Zone zone = new Zone();
        zone.setName(request.name().trim());
        Zone saved = zoneRepository.save(zone);
        return new ZoneResponse(saved.getId(), saved.getName(), List.of());
    }

    public ZoneAreaResponse addAreaToZone(Long zoneId, CreateZoneAreaRequest request) {
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new IllegalArgumentException("Zone not found"));

        ZoneArea area = new ZoneArea();
        area.setZone(zone);
        area.setAreaName(request.areaName().trim());

        ZoneArea saved = zoneAreaRepository.save(area);
        return new ZoneAreaResponse(saved.getId(), zone.getId(), saved.getAreaName());
    }

    // Rate Cards Management
    @Transactional(readOnly = true)
    public List<RateCardResponse> getAllRateCards() {
        return rateCardRepository.findAll().stream().map(this::mapToRateCardResponse).toList();
    }

    public RateCardResponse saveRateCard(RateCardRequest request) {
        Zone pickupZone = zoneRepository.findById(request.pickupZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Pickup zone not found"));
        Zone dropZone = zoneRepository.findById(request.dropZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Drop zone not found"));

        RateCard rateCard = rateCardRepository
                .findByPickupZoneIdAndDropZoneIdAndOrderType(pickupZone.getId(), dropZone.getId(), request.orderType())
                .orElseGet(() -> {
                    RateCard rc = new RateCard();
                    rc.setPickupZone(pickupZone);
                    rc.setDropZone(dropZone);
                    rc.setOrderType(request.orderType());
                    return rc;
                });

        rateCard.setRatePerKg(request.ratePerKg());
        rateCard.setMinimumCharge(request.minimumCharge());

        RateCard saved = rateCardRepository.save(rateCard);
        return mapToRateCardResponse(saved);
    }

    public RateCardResponse updateRateCard(Long id, RateCardRequest request) {
        RateCard rateCard = rateCardRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rate card not found"));

        Zone pickupZone = zoneRepository.findById(request.pickupZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Pickup zone not found"));
        Zone dropZone = zoneRepository.findById(request.dropZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Drop zone not found"));

        rateCard.setPickupZone(pickupZone);
        rateCard.setDropZone(dropZone);
        rateCard.setOrderType(request.orderType());
        rateCard.setRatePerKg(request.ratePerKg());
        rateCard.setMinimumCharge(request.minimumCharge());

        RateCard saved = rateCardRepository.save(rateCard);
        return mapToRateCardResponse(saved);
    }

    // COD Surcharge Management
    @Transactional(readOnly = true)
    public List<CodChargeResponse> getAllCodCharges() {
        return codChargeRepository.findAll().stream()
                .map(c -> new CodChargeResponse(c.getId(), c.getOrderType(), c.getSurcharge()))
                .toList();
    }

    public CodChargeResponse saveCodCharge(CodChargeRequest request) {
        CodCharge codCharge = codChargeRepository.findByOrderType(request.orderType())
                .orElseGet(() -> {
                    CodCharge c = new CodCharge();
                    c.setOrderType(request.orderType());
                    return c;
                });

        codCharge.setSurcharge(request.surcharge());
        CodCharge saved = codChargeRepository.save(codCharge);
        return new CodChargeResponse(saved.getId(), saved.getOrderType(), saved.getSurcharge());
    }

    private RateCardResponse mapToRateCardResponse(RateCard rateCard) {
        return new RateCardResponse(
                rateCard.getId(),
                rateCard.getPickupZone().getId(),
                rateCard.getPickupZone().getName(),
                rateCard.getDropZone().getId(),
                rateCard.getDropZone().getName(),
                rateCard.getOrderType(),
                rateCard.getRatePerKg(),
                rateCard.getMinimumCharge());
    }
}
