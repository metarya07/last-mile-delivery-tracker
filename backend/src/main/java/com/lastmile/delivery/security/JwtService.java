package com.lastmile.delivery.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final String secret;
    private final long expiration;
    public JwtService(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration}") long expiration) { this.secret = secret; this.expiration = expiration; }
    public String generateToken(UserDetails user, String role) {
        return Jwts.builder().subject(user.getUsername()).claim("role", role).issuedAt(new Date()).expiration(Date.from(Instant.now().plusMillis(expiration))).signWith(key()).compact();
    }
    public String username(String token) { return claims(token).getSubject(); }
    public boolean valid(String token, UserDetails user) { return username(token).equalsIgnoreCase(user.getUsername()) && claims(token).getExpiration().after(new Date()); }
    private Claims claims(String token) { return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload(); }
    private SecretKey key() {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 characters long");
        return Keys.hmacShaKeyFor(bytes);
    }
}
