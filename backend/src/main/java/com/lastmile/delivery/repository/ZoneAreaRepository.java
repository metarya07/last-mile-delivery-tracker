package com.lastmile.delivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lastmile.delivery.entity.ZoneArea;

public interface ZoneAreaRepository
        extends JpaRepository<ZoneArea, Long> {

    List<ZoneArea> findByZoneId(Long zoneId);
}