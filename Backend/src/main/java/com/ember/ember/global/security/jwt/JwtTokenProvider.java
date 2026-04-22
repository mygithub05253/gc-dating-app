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

    /** Authentication 객체 생성 — 관리자 토큰(tokenType="ADMIN")은 adminRole claim을 Authority로 사용 */
    public Authentication getAuthentication(String token) {
        Long id = getUserIdFromToken(token);
        String tokenType = getTokenTypeFromToken(token);
        String role;
        if ("ADMIN".equals(tokenType)) {
            String adminRole = getAdminRoleFromToken(token);
            // Spring Security hasRole 매칭을 위해 ROLE_ 접두어 부여 (ROLE_VIEWER/ROLE_ADMIN/ROLE_SUPER_ADMIN)
            role = adminRole == null ? null : "ROLE_" + adminRole;
        } else {
            role = getRoleFromToken(token);
        }
        CustomUserDetails userDetails = new CustomUserDetails(id, role);
        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    // ── 관리자 전용 JWT (관리자 API 통합명세서 v2.1 §1.1) ─────────────────────────
    // claim: subject=adminId, email, adminRole, tokenType="ADMIN", type="access"|"refresh"

    /** 관리자 Access Token 생성 (30분) */
    public String createAdminAccessToken(Long adminId, String email, String adminRole) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getAccessExpiration());

        return Jwts.builder()
                .subject(String.valueOf(adminId))
                .claim("email", email)
                .claim("adminRole", adminRole)
                .claim("tokenType", "ADMIN")
                .claim("type", "access")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /** 관리자 Refresh Token 생성 (7일) */
    public String createAdminRefreshToken(Long adminId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getRefreshExpiration());

        return Jwts.builder()
                .subject(String.valueOf(adminId))
                .claim("tokenType", "ADMIN")
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /** 토큰에서 tokenType 추출 (관리자 구분용, 없으면 null) */
    public String getTokenTypeFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.get("tokenType", String.class);
    }

    /** 토큰에서 adminRole 추출 */
    public String getAdminRoleFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.get("adminRole", String.class);
    }

    /** 토큰에서 type 추출 ("access" 또는 "refresh") */
    public String getTypeFromToken(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.get("type", String.class);
    }

    /** 만료된 토큰에서도 subject(adminId)를 추출 — 로그아웃 시 사용 */
    public Long getAdminIdFromTokenAllowExpired(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(secretKey).build()
                    .parseSignedClaims(token).getPayload();
            return Long.parseLong(claims.getSubject());
        } catch (ExpiredJwtException e) {
            return Long.parseLong(e.getClaims().getSubject());
        }
    }
}
