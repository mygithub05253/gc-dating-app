package com.ember.ember.admin.service.withdrawal;

import com.ember.ember.admin.dto.withdrawal.WithdrawalLogResponse;
import com.ember.ember.admin.dto.withdrawal.WithdrawalStatsResponse;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminWithdrawalService {

    private final EntityManager em;

    /**
     * 탈퇴 통계 조회 (기간별)
     */
    public WithdrawalStatsResponse getWithdrawalStats(String period) {
        int days = parsePeriodDays(period);
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        // 기간 내 총 탈퇴 수
        Long totalWithdrawals = (Long) em.createQuery(
                        "SELECT COUNT(w) FROM UserWithdrawalLog w WHERE w.withdrawnAt >= :since")
                .setParameter("since", since)
                .getSingleResult();

        // 삭제 대기 (영구 삭제 예정이지만 아직 삭제 전)
        Long pendingDeletion = (Long) em.createQuery(
                        "SELECT COUNT(w) FROM UserWithdrawalLog w WHERE w.permanentDeleteAt > :now")
                .setParameter("now", LocalDateTime.now())
                .getSingleResult();

        // 사유별 분류
        @SuppressWarnings("unchecked")
        List<Object[]> reasonRows = em.createQuery(
                        "SELECT COALESCE(w.reason, '미지정'), COUNT(w) FROM UserWithdrawalLog w " +
                                "WHERE w.withdrawnAt >= :since GROUP BY w.reason ORDER BY COUNT(w) DESC")
                .setParameter("since", since)
                .getResultList();

        List<WithdrawalStatsResponse.ReasonBreakdown> byReason = reasonRows.stream()
                .map(row -> new WithdrawalStatsResponse.ReasonBreakdown(
                        (String) row[0], ((Number) row[1]).longValue()))
                .toList();

        // 일별 추이 (네이티브 쿼리 — DATE 캐스트)
        @SuppressWarnings("unchecked")
        List<Object[]> dailyRows = em.createNativeQuery(
                        "SELECT CAST(w.withdrawn_at AS DATE) AS d, COUNT(*) " +
                                "FROM user_withdrawal_log w " +
                                "WHERE w.withdrawn_at >= :since " +
                                "GROUP BY CAST(w.withdrawn_at AS DATE) ORDER BY d")
                .setParameter("since", Timestamp.valueOf(since))
                .getResultList();

        List<WithdrawalStatsResponse.DailyTrend> dailyTrend = dailyRows.stream()
                .map(row -> {
                    LocalDate date = row[0] instanceof java.sql.Date sqlDate
                            ? sqlDate.toLocalDate()
                            : ((Timestamp) row[0]).toLocalDateTime().toLocalDate();
                    long count = ((Number) row[1]).longValue();
                    return new WithdrawalStatsResponse.DailyTrend(date, count);
                })
                .toList();

        return new WithdrawalStatsResponse(totalWithdrawals, pendingDeletion, byReason, dailyTrend);
    }

    /**
     * 탈퇴 로그 목록 조회 (페이징)
     */
    public Page<WithdrawalLogResponse> getWithdrawalLogs(Pageable pageable, String reason,
                                                         LocalDate startDate, LocalDate endDate) {
        StringBuilder jpql = new StringBuilder(
                "SELECT w.id, w.user.id, w.user.nickname, w.reason, w.detail, w.withdrawnAt, w.permanentDeleteAt " +
                        "FROM UserWithdrawalLog w WHERE 1=1 ");
        StringBuilder countJpql = new StringBuilder(
                "SELECT COUNT(w) FROM UserWithdrawalLog w WHERE 1=1 ");

        List<String> conditions = new ArrayList<>();
        if (reason != null && !reason.isBlank()) {
            conditions.add(" AND w.reason = :reason");
        }
        if (startDate != null) {
            conditions.add(" AND w.withdrawnAt >= :startDate");
        }
        if (endDate != null) {
            conditions.add(" AND w.withdrawnAt < :endDate");
        }

        for (String cond : conditions) {
            jpql.append(cond);
            countJpql.append(cond);
        }
        jpql.append(" ORDER BY w.withdrawnAt DESC");

        Query query = em.createQuery(jpql.toString());
        Query countQuery = em.createQuery(countJpql.toString());

        if (reason != null && !reason.isBlank()) {
            query.setParameter("reason", reason);
            countQuery.setParameter("reason", reason);
        }
        if (startDate != null) {
            LocalDateTime start = startDate.atStartOfDay();
            query.setParameter("startDate", start);
            countQuery.setParameter("startDate", start);
        }
        if (endDate != null) {
            LocalDateTime end = endDate.plusDays(1).atStartOfDay();
            query.setParameter("endDate", end);
            countQuery.setParameter("endDate", end);
        }

        long total = (Long) countQuery.getSingleResult();

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();

        List<WithdrawalLogResponse> content = rows.stream()
                .map(row -> new WithdrawalLogResponse(
                        ((Number) row[0]).longValue(),
                        row[1] != null ? ((Number) row[1]).longValue() : null,
                        (String) row[2],
                        (String) row[3],
                        (String) row[4],
                        (LocalDateTime) row[5],
                        (LocalDateTime) row[6]
                ))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }

    private int parsePeriodDays(String period) {
        if (period == null || period.isBlank()) return 30;
        return switch (period.toLowerCase()) {
            case "7d" -> 7;
            case "30d" -> 30;
            case "90d" -> 90;
            default -> throw new BusinessException(ErrorCode.ADM_WITHDRAWAL_DATE_INVALID);
        };
    }
}
