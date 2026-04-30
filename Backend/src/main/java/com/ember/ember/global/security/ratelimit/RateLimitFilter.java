package com.ember.ember.global.security.ratelimit;

import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.response.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * §13.4 API Rate Limiting 필터
 * Redis Sliding Window Counter 기반, IP/userId 기준 다단계 제한
 */
@Slf4j
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    // ── 엔드포인트별 세부 제한 (endpoint prefix → {limit, windowSeconds}) ──
    private static final Map<String, int[]> ENDPOINT_LIMITS = Map.ofEntries(
            // 인증 전 API (IP 기준)
            Map.entry("POST:/api/auth/social", new int[]{5, 60}),
            Map.entry("POST:/api/auth/refresh", new int[]{10, 60}),
            // 인증 후 쓰기 API
            Map.entry("POST:/api/matching/", new int[]{10, 60}),     // select, skip 포함
            Map.entry("POST:/api/users/", new int[]{10, 60}),        // report, block
            Map.entry("POST:/api/diaries", new int[]{5, 60})
    );

    // 글로벌 기본값
    private static final int DEFAULT_AUTH_LIMIT = 60;       // 인증 후 일반
    private static final int DEFAULT_UNAUTH_LIMIT = 20;     // 인증 전
    private static final int DEFAULT_WRITE_LIMIT = 30;      // 인증 후 쓰기
    private static final int DEFAULT_WINDOW_SECONDS = 60;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String method = request.getMethod();
        String path = request.getRequestURI();

        // Swagger, 헬스체크, WebSocket, 정적 리소스 제외
        if (isExcluded(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 식별 키 결정 (인증 후 → userId, 인증 전 → IP)
        String identifier = resolveIdentifier(request);
        boolean authenticated = !identifier.startsWith("IP:");

        // 제한값 결정
        int[] limitConfig = resolveLimit(method, path, authenticated);
        int limit = limitConfig[0];
        int windowSeconds = limitConfig[1];

        // Sliding Window Counter 체크
        String redisKey = buildRedisKey(identifier, method, path, windowSeconds);
        long currentCount = incrementAndGet(redisKey, windowSeconds);

        // Rate Limit 헤더 추가
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - currentCount)));
        response.setHeader("X-RateLimit-Reset", String.valueOf(
                System.currentTimeMillis() / 1000 + windowSeconds));

        if (currentCount > limit) {
            log.warn("[Rate Limit] 초과 — identifier={}, endpoint={} {}, count={}/{}",
                    identifier, method, path, currentCount, limit);
            writeErrorResponse(response, windowSeconds);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /** Redis INCR + TTL 설정 */
    private long incrementAndGet(String key, int windowSeconds) {
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofSeconds(windowSeconds));
            }
            return count != null ? count : 0;
        } catch (Exception e) {
            log.warn("[Rate Limit] Redis 장애 — 제한 없이 통과: {}", e.getMessage());
            return 0; // Redis 장애 시 통과 (Fail-Open)
        }
    }

    /** 식별 키 결정 */
    private String resolveIdentifier(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return "USER:" + auth.getName();
        }
        String ip = getClientIp(request);
        return "IP:" + ip;
    }

    /** 클라이언트 IP 추출 (리버스 프록시 대응) */
    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }

    /** 엔드포인트별 제한값 결정 */
    private int[] resolveLimit(String method, String path, boolean authenticated) {
        // 엔드포인트별 세부 제한 확인
        String key = method + ":" + path;
        for (Map.Entry<String, int[]> entry : ENDPOINT_LIMITS.entrySet()) {
            if (key.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }

        // 글로벌 기본값
        if (!authenticated) {
            return new int[]{DEFAULT_UNAUTH_LIMIT, DEFAULT_WINDOW_SECONDS};
        }
        if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method)) {
            return new int[]{DEFAULT_WRITE_LIMIT, DEFAULT_WINDOW_SECONDS};
        }
        return new int[]{DEFAULT_AUTH_LIMIT, DEFAULT_WINDOW_SECONDS};
    }

    /** Redis 키 생성 (윈도우 단위) */
    private String buildRedisKey(String identifier, String method, String path, int windowSeconds) {
        long windowStart = System.currentTimeMillis() / 1000 / windowSeconds;
        // 경로에서 ID 부분 제거하여 그룹핑 (예: /api/matching/123/select → /api/matching/*/select)
        String normalizedPath = path.replaceAll("/\\d+", "/*");
        return String.format("rate:%s:%s:%s:%d", identifier, method, normalizedPath, windowStart);
    }

    /** 제외 경로 */
    private boolean isExcluded(String path) {
        return path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs")
                || path.startsWith("/ws/") || path.equals("/api/health")
                || path.startsWith("/actuator")
                || path.startsWith("/api/dev/");
    }

    /** 429 응답 직접 작성 */
    private void writeErrorResponse(HttpServletResponse response, int retryAfter) throws IOException {
        response.setStatus(HttpServletResponse.SC_OK); // 래핑된 응답은 200으로
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Retry-After", String.valueOf(retryAfter));

        // 실제 HTTP 상태는 429
        response.setStatus(429);

        ApiResponse<Void> body = ApiResponse.error(ErrorCode.RATE_LIMIT_EXCEEDED);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
