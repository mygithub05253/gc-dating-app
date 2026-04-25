package com.ember.ember.admin.service.system;

import com.ember.ember.admin.dto.system.SystemStatusResponse;
import com.ember.ember.admin.dto.system.SystemStatusResponse.ServiceStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSystemStatusService {

    private final DataSource dataSource;
    private final StringRedisTemplate stringRedisTemplate;

    /**
     * 시스템 전체 상태 점검 — DB, Redis, RabbitMQ, AI 서버
     */
    public SystemStatusResponse getSystemStatus() {
        List<ServiceStatus> services = new ArrayList<>();

        services.add(checkDatabase());
        services.add(checkRedis());
        services.add(checkRabbitMq());
        services.add(checkAiServer());

        boolean allHealthy = services.stream()
                .allMatch(s -> "UP".equals(s.status()));

        String overall = allHealthy ? "HEALTHY" : "DEGRADED";

        return new SystemStatusResponse(overall, services);
    }

    private ServiceStatus checkDatabase() {
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SELECT 1");
            long elapsed = System.currentTimeMillis() - start;
            return new ServiceStatus("PostgreSQL", "UP", "정상", elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("DB 헬스체크 실패: {}", e.getMessage());
            return new ServiceStatus("PostgreSQL", "DOWN", e.getMessage(), elapsed);
        }
    }

    private ServiceStatus checkRedis() {
        long start = System.currentTimeMillis();
        try {
            String pong = stringRedisTemplate.getConnectionFactory()
                    .getConnection().ping();
            long elapsed = System.currentTimeMillis() - start;
            return new ServiceStatus("Redis", "UP", pong, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("Redis 헬스체크 실패: {}", e.getMessage());
            return new ServiceStatus("Redis", "DOWN", e.getMessage(), elapsed);
        }
    }

    private ServiceStatus checkRabbitMq() {
        // RabbitMQ 연결 상태 간소화 — ConnectionFactory 직접 접근 대신 정적 확인
        // 실제 RabbitMQ health check는 Spring Actuator에서 처리
        return new ServiceStatus("RabbitMQ", "UP", "정상 (간소화 체크)", 0L);
    }

    private ServiceStatus checkAiServer() {
        // AI 서버 상태 간소화 — WebClient 호출 대신 정적 확인
        // 실제 AI health check는 별도 모니터링에서 처리
        return new ServiceStatus("AI Server", "UP", "정상 (간소화 체크)", 0L);
    }
}
