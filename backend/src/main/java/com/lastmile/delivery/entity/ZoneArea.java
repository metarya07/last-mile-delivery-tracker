package com.lastmile.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "zone_areas", uniqueConstraints = @UniqueConstraint(columnNames = {"zone_id", "area_name"})) @Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ZoneArea {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "zone_id", nullable = false) private Zone zone;
    @Column(name = "area_name", nullable = false, length = 150) private String areaName;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void created() { createdAt = Instant.now(); }
}
