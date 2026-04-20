package com.ember.ember.global.security.jwt;

import com.ember.ember.global.security.CustomUserDetails;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;
    private SecretKey secretKey;

    @PostConstruct
    protected void init() {
        this.secretKey = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    /** Access Token 생성 (30분) */
    public String createAccessToken(Long userId, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getAccessExpiration());

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /** Refresh Token 생성 (7일) */
    public String createRefreshToken(Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getRefreshExpiration());

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /** 토큰 유효성 검증 */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("만료된 JWT 토큰: {}", e.getMessage());
        } catch (JwtException e) {
            log.warn("유효하지 않은 JWT 토큰: {}", e.getMessage());
        }
        return false;
    }

    /** 토큰에서 userId 추출 */
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return Long.parseLong(claims.getSubject());
    }

    /** 토큰에서 role 추출 */
    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.get("role", String.class);
    }

    /** 토큰 남은 만료 시간 (ms) */
    public long getRemainingExpiration(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.getExpiration().getTime() - System.currentTimeMillis();
    }

    /** Authentication 객체 생성 */
    public Authentication getAuthentication(String token) {
        Long userId = getUserIdFromToken(token);
        String role = getRoleFromToken(token);
        CustomUserDetails userDetails = new CustomUserDetails(userId, role);
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }
}
