package com.ember.ember.observability.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * HTTP 요청마다 MDC 컨텍스트를 설정하는 필터.
 *
 * <p>MDC 키:
 * <ul>
 *   <li>{@code requestId} — X-Request-ID 헤더 값 또는 신규 UUID</li>
 *   <li>{@code traceId} / {@code spanId} — Micrometer Tracing이 자동 주입 (이 필터는 직접 설정 안 함)</li>
 * </ul>
 *
 * <p>응답 헤더에도 X-Request-ID를 반환해 클라이언트가 로그 상관 ID를 추적할 수 있도록 한다.
 * 필터 실행 후 MDC를 반드시 정리(clear)한다.
 */
@Order(1)
@Component
public class RequestTraceFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String MDC_REQUEST_ID = "requestId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // X-Request-ID 헤더 추출 — 없으면 서버에서 생성
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_REQUEST_ID, requestId);

        // 응답 헤더에도 동일 ID를 반환 (클라이언트 트레이싱 지원)
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            // 요청 처리 완료 후 MDC 정리 — 스레드 풀 재사용 환경에서 누수 방지
            MDC.remove(MDC_REQUEST_ID);
        }
    }
}
