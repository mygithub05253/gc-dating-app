package com.ember.ember.admin.service.content;

import com.ember.ember.admin.dto.content.AdminDiaryListResponse;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 일기 관리 서비스 — §6 콘텐��� 관리.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDiaryService {

    private final EntityManager em;

    /**
     * 관리자 일기 목록 조회.
     * status 필터: ACTIVE(deleted_at IS NULL), DELETED(deleted_at IS NOT NULL), REPORTED(사용자 status=ANALYZING 등).
     * null 이면 전체 조회.
     */
    public Page<AdminDiaryListResponse> list(String statusFilter, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
                SELECT d.id, d.user_id, u.nickname, d.title,
                       SUBSTRING(d.content, 1, 100) AS content_preview,
                       d.date, d.status, d.analysis_status, d.visibility,
                       d.created_at, d.deleted_at
                FROM diaries d
                JOIN users u ON d.user_id = u.id
                """);

        StringBuilder countSql = new StringBuilder("""
                SELECT COUNT(*) FROM diaries d
                JOIN users u ON d.user_id = u.id
                """);

        String where = buildDiaryWhere(statusFilter);
        sql.append(where);
        countSql.append(where);

        sql.append(" ORDER BY d.created_at DESC");

        Query query = em.createNativeQuery(sql.toString());
        Query countQuery = em.createNativeQuery(countSql.toString());

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        long total = ((Number) countQuery.getSingleResult()).longValue();

        List<AdminDiaryListResponse> content = rows.stream()
                .map(r -> new AdminDiaryListResponse(
                        ((Number) r[0]).longValue(),
                        ((Number) r[1]).longValue(),
                        (String) r[2],
                        (String) r[3],
                        (String) r[4],
                        r[5] instanceof LocalDate ld ? ld : ((java.sql.Date) r[5]).toLocalDate(),
                        (String) r[6],
                        (String) r[7],
                        (String) r[8],
                        r[9] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[9]).toLocalDateTime(),
                        r[10] == null ? null : (r[10] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[10]).toLocalDateTime())
                ))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }

    /**
     * 관리자 일기 소프트 삭제 (deleted_at 설정).
     */
    @Transactional
    public void softDelete(Long diaryId, String adminMemo) {
        int updated = em.createNativeQuery(
                "UPDATE diaries SET deleted_at = NOW() WHERE id = :diaryId AND deleted_at IS NULL")
                .setParameter("diaryId", diaryId)
                .executeUpdate();

        if (updated == 0) {
            throw new BusinessException(ErrorCode.ADM_DIARY_NOT_FOUND);
        }
        log.info("[ADMIN_DIARY_DELETE] diaryId={} memo={}", diaryId, adminMemo);
    }

    private String buildDiaryWhere(String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank()) {
            return "";
        }
        return switch (statusFilter.toUpperCase()) {
            case "ACTIVE" -> " WHERE d.deleted_at IS NULL";
            case "DELETED" -> " WHERE d.deleted_at IS NOT NULL";
            case "REPORTED" -> " WHERE d.status = 'ANALYZING'";
            default -> "";
        };
    }
}
