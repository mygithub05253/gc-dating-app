package com.ember.ember.admin.service.dashboard;

import com.ember.ember.admin.dto.dashboard.DailyStatsResponse;
import com.ember.ember.admin.dto.dashboard.DashboardKpiResponse;
import com.ember.ember.admin.dto.dashboard.MatchingStatsResponse;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리자 대시보드 서비스 — KPI, 일별 통계, 매칭 통계, CSV 내보내기.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final String KPI_CACHE_KEY = "DASH:KPI";
    private static final Duration KPI_CACHE_TTL = Duration.ofMinutes(5);

    private final EntityManager entityManager;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────────────────────────────
    // KPI (Redis 캐시 5분)
    // ─────────────────────────────────────────────────────────────────────
    public DashboardKpiResponse getKpi() {
        // 1) Redis 캐시 조회
        try {
            String cached = stringRedisTemplate.opsForValue().get(KPI_CACHE_KEY);
            if (cached != null) {
                return objectMapper.readValue(cached, DashboardKpiResponse.class);
            }
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("KPI Redis 캐시 읽기 실패, DB 조회로 폴백: {}", e.getMessage());
        }

        // 2) DB 조회
        DashboardKpiResponse kpi = queryKpiFromDb();

        // 3) 캐시 워밍
        try {
            stringRedisTemplate.opsForValue().set(
                KPI_CACHE_KEY, objectMapper.writeValueAsString(kpi), KPI_CACHE_TTL);
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("KPI Redis 캐시 쓰기 실패: {}", e.getMessage());
        }

        return kpi;
    }

    @SuppressWarnings("unchecked")
    private DashboardKpiResponse queryKpiFromDb() {
        // DAU: 오늘 로그인한 사용자 수 (last_login_at 기준)
        long dau = singleLong(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL " +
            "AND last_login_at >= CURRENT_DATE AND last_login_at < CURRENT_DATE + INTERVAL '1 day'");

        // MAU: 최근 30일 로그인 사용자 수
        long mau = singleLong(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL " +
            "AND last_login_at >= CURRENT_DATE - INTERVAL '30 days'");

        // 오늘 신규 가입자
        long newUsersToday = singleLong(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL " +
            "AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'");

        // 오늘 매칭 성사 수
        long matchesToday = singleLong(
            "SELECT COUNT(*) FROM matchings " +
            "WHERE status = 'MATCHED' " +
            "AND matched_at >= CURRENT_DATE AND matched_at < CURRENT_DATE + INTERVAL '1 day'");

        // 대기 중인 신고
        long pendingReports = singleLong(
            "SELECT COUNT(*) FROM reports WHERE status IN ('PENDING', 'IN_REVIEW')");

        // 활성 교환일기 방
        long activeExchanges = singleLong(
            "SELECT COUNT(*) FROM exchange_rooms WHERE status NOT IN ('ENDED', 'TERMINATED')");

        return new DashboardKpiResponse(dau, mau, newUsersToday, matchesToday, pendingReports, activeExchanges);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 일별 통계
    // ─────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public List<DailyStatsResponse> getDailyStats(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new BusinessException(ErrorCode.ADM_DASHBOARD_DATE_INVALID);
        }

        String sql = """
            SELECT
                d.dt::date AS date,
                COALESCE(nu.cnt, 0) AS new_users,
                COALESCE(au.cnt, 0) AS active_users,
                COALESCE(m.cnt, 0) AS matches,
                COALESCE(di.cnt, 0) AS diaries
            FROM generate_series(CAST(:start AS date), CAST(:end AS date), '1 day') AS d(dt)
            LEFT JOIN (
                SELECT created_at::date AS dt, COUNT(*) AS cnt
                FROM users WHERE deleted_at IS NULL
                GROUP BY created_at::date
            ) nu ON nu.dt = d.dt::date
            LEFT JOIN (
                SELECT last_login_at::date AS dt, COUNT(DISTINCT id) AS cnt
                FROM users WHERE deleted_at IS NULL AND last_login_at IS NOT NULL
                GROUP BY last_login_at::date
            ) au ON au.dt = d.dt::date
            LEFT JOIN (
                SELECT matched_at::date AS dt, COUNT(*) AS cnt
                FROM matchings WHERE status = 'MATCHED'
                GROUP BY matched_at::date
            ) m ON m.dt = d.dt::date
            LEFT JOIN (
                SELECT created_at::date AS dt, COUNT(*) AS cnt
                FROM diaries WHERE deleted_at IS NULL
                GROUP BY created_at::date
            ) di ON di.dt = d.dt::date
            ORDER BY d.dt
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", startDate);
        query.setParameter("end", endDate);

        List<Object[]> rows = query.getResultList();
        List<DailyStatsResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new DailyStatsResponse(
                ((java.sql.Date) row[0]).toLocalDate(),
                ((Number) row[1]).longValue(),
                ((Number) row[2]).longValue(),
                ((Number) row[3]).longValue(),
                ((Number) row[4]).longValue()
            ));
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 매칭 통계
    // ─────────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public MatchingStatsResponse getMatchingStats() {
        long totalMatches = singleLong("SELECT COUNT(*) FROM matchings WHERE status = 'MATCHED'");

        long totalRequests = singleLong("SELECT COUNT(*) FROM matchings");
        double successRate = totalRequests > 0 ? (double) totalMatches / totalRequests * 100.0 : 0.0;

        // 평균 매칭 소요 시간 (요청 → 성사, 시간 단위)
        double avgMatchTimeHours = singleDouble(
            "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600.0), 0) " +
            "FROM matchings WHERE status = 'MATCHED' AND matched_at IS NOT NULL");

        // 이상형 키워드 TOP 10
        String topKeywordSql = """
            SELECT k.label, COUNT(*) AS cnt
            FROM user_ideal_keywords uit
            JOIN keywords k ON k.id = uit.keyword_id
            GROUP BY k.label
            ORDER BY cnt DESC
            LIMIT 10
            """;
        Query keywordQuery = entityManager.createNativeQuery(topKeywordSql);
        List<Object[]> keywordRows = keywordQuery.getResultList();
        List<MatchingStatsResponse.KeywordCount> topKeywords = new ArrayList<>();
        for (Object[] row : keywordRows) {
            topKeywords.add(new MatchingStatsResponse.KeywordCount(
                (String) row[0],
                ((Number) row[1]).longValue()
            ));
        }

        return new MatchingStatsResponse(totalMatches, successRate, avgMatchTimeHours, topKeywords);
    }

    // ─────────────────────────────────────────────────────────────────────
    // CSV 내보내기
    // ─────────────────────────────────────────────────────────────────────
    public byte[] exportSummary(LocalDate startDate, LocalDate endDate, String format) {
        if (startDate.isAfter(endDate)) {
            throw new BusinessException(ErrorCode.ADM_DASHBOARD_DATE_INVALID);
        }

        List<DailyStatsResponse> stats = getDailyStats(startDate, endDate);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // BOM for Excel UTF-8 compatibility
        try {
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
        } catch (Exception ignored) {
        }

        PrintWriter writer = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8));
        writer.println("날짜,신규 가입,활성 사용자,매칭 성사,일기 작성");
        for (DailyStatsResponse row : stats) {
            writer.printf("%s,%d,%d,%d,%d%n",
                row.date(), row.newUsers(), row.activeUsers(), row.matches(), row.diaries());
        }
        writer.flush();
        return baos.toByteArray();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 유틸
    // ─────────────────────────────────────────────────────────────────────
    private long singleLong(String sql) {
        Object result = entityManager.createNativeQuery(sql).getSingleResult();
        return result != null ? ((Number) result).longValue() : 0L;
    }

    private double singleDouble(String sql) {
        Object result = entityManager.createNativeQuery(sql).getSingleResult();
        return result != null ? ((Number) result).doubleValue() : 0.0;
    }
}
