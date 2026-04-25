package com.ember.ember.admin.service.matching;

import com.ember.ember.admin.dto.matching.AdminMatchingStatsResponse;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 매칭 통계 서비스 — §7.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMatchingStatsService {

    private final EntityManager em;

    public AdminMatchingStatsResponse getStats() {
        // 전체 매칭 수 (MATCHED 상태)
        long totalMatchCount = ((Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM matchings WHERE status = 'MATCHED'")
                .getSingleResult()).longValue();

        // 전체 매칭 요청 수
        long totalRequests = ((Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM matchings")
                .getSingleResult()).longValue();

        double matchRate = totalRequests == 0 ? 0.0 : (double) totalMatchCount / totalRequests * 100;

        // 평균 매칭 소요 시간 (요청 ~ 성사 시간)
        Object avgResult = em.createNativeQuery(
                "SELECT AVG(EXTRACT(EPOCH FROM (matched_at - created_at)) / 3600.0) FROM matchings WHERE status = 'MATCHED' AND matched_at IS NOT NULL")
                .getSingleResult();
        double avgMatchTimeHours = avgResult == null ? 0.0 : ((Number) avgResult).doubleValue();

        // 활성 교환방
        long activeExchangeRooms = ((Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM exchange_rooms WHERE status = 'ACTIVE'")
                .getSingleResult()).longValue();

        // 완료 교환방
        long completedExchangeRooms = ((Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM exchange_rooms WHERE status IN ('COMPLETED', 'CHAT_CONNECTED', 'ENDED')")
                .getSingleResult()).longValue();

        return new AdminMatchingStatsResponse(
                totalMatchCount,
                Math.round(matchRate * 100.0) / 100.0,
                Math.round(avgMatchTimeHours * 100.0) / 100.0,
                activeExchangeRooms,
                completedExchangeRooms
        );
    }
}
