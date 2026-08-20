package com.lastmile.delivery.repository;
import com.lastmile.delivery.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ZoneRepository extends JpaRepository<Zone, Long> { Optional<Zone> findByNameIgnoreCase(String name); }
