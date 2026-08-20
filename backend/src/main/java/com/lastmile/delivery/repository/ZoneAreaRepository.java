package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.ZoneArea;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ZoneAreaRepository extends JpaRepository<ZoneArea, Long> { List<ZoneArea> findByZoneId(Long zoneId); }
