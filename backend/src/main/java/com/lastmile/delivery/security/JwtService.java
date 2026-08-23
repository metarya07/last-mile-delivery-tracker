package com.lastmile.delivery.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import com.lastmile.delivery.entity.Role;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expiration;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {

        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);

        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "jwt.secret must be at least 32 characters long");
        }

        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
        this.expiration = expiration;
    }

    public String generateToken(
            UserDetails user,
            String role) {
        return generateToken(user, role, null);
    }

    public String generateToken(
            UserDetails user,
            String role,
            Long userId) {

        Date issuedAt = new Date();

        Date expirationDate = Date.from(
                Instant.now().plusMillis(expiration));

        var builder = Jwts.builder()
                .subject(user.getUsername())
                .claim("role", role)
                .issuedAt(issuedAt)
                .expiration(expirationDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        try {
            Role userRole = Role.valueOf(role);
            var permissions = RbacConfig.getPermissions(userRole)
                    .stream()
                    .map(Permission::name)
                    .toList();
            builder.claim("permissions", permissions);
        } catch (Exception ignored) {
        }

        return builder
                .signWith(signingKey)
                .compact();
    }

    public String username(String token) {
        return getClaims(token).getSubject();
    }

    public boolean valid(
            String token,
            UserDetails user) {

        Claims claims = getClaims(token);

        return claims.getSubject()
                .equalsIgnoreCase(user.getUsername())
                && claims.getExpiration().after(new Date());
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}