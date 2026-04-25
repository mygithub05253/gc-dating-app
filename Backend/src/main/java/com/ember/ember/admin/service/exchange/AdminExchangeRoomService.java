package com.ember.ember.admin.service.exchange;

import com.ember.ember.admin.dto.exchange.AdminExchangeRoomDetailResponse;
import com.ember.ember.admin.dto.exchange.AdminExchangeRoomListResponse;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 관리자 교환일기 방 서비스 — §7.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminExchangeRoomService {

    private final EntityManager em;

    /**
     * 교환일기 방 목록 조회.
     */
    public Page<AdminExchangeRoomListResponse> list(String statusFilter, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
                SELECT er.id, er.room_uuid,
                       er.user_a_id, ua.nickname,
                       er.user_b_id, ub.nickname,
                       er.status, er.turn_count, er.round_count,
                       er.deadline_at, er.created_at
                FROM exchange_rooms er
                JOIN users ua ON er.user_a_id = ua.id
                JOIN users ub ON er.user_b_id = ub.id
                """);

        StringBuilder countSql = new StringBuilder(
                "SELECT COUNT(*) FROM exchange_rooms er");

        if (statusFilter != null && !statusFilter.isBlank()) {
            String where = " WHERE er.status = :status";
            sql.append(where);
            countSql.append(where);
        }

        sql.append(" ORDER BY er.created_at DESC");

        Query query = em.createNativeQuery(sql.toString());
        Query countQuery = em.createNativeQuery(countSql.toString());

        if (statusFilter != null && !statusFilter.isBlank()) {
            query.setParameter("status", statusFilter.toUpperCase());
            countQuery.setParameter("status", statusFilter.toUpperCase());
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        long total = ((Number) countQuery.getSingleResult()).longValue();

        List<AdminExchangeRoomListResponse> content = rows.stream()
                .map(r -> new AdminExchangeRoomListResponse(
                        ((Number) r[0]).longValue(),
                        (UUID) r[1],
                        ((Number) r[2]).longValue(),
                        (String) r[3],
                        ((Number) r[4]).longValue(),
                        (String) r[5],
                        (String) r[6],
                        ((Number) r[7]).intValue(),
                        ((Number) r[8]).intValue(),
                        r[9] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[9]).toLocalDateTime(),
                        r[10] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[10]).toLocalDateTime()
                ))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }

    /**
     * 교환일기 방 상세 조회.
     */
    public AdminExchangeRoomDetailResponse getDetail(Long roomId) {
        // 방 기본 정보
        @SuppressWarnings("unchecked")
        List<Object[]> roomRows = em.createNativeQuery("""
                SELECT er.id, er.room_uuid,
                       er.user_a_id, ua.nickname,
                       er.user_b_id, ub.nickname,
                       er.status, er.turn_count, er.round_count,
                       er.current_turn_user_id, er.deadline_at,
                       er.next_step_deadline_at, er.matching_id, er.chat_room_id,
                       er.created_at
                FROM exchange_rooms er
                JOIN users ua ON er.user_a_id = ua.id
                JOIN users ub ON er.user_b_id = ub.id
                WHERE er.id = :roomId
                """)
                .setParameter("roomId", roomId)
                .getResultList();

        if (roomRows.isEmpty()) {
            throw new BusinessException(ErrorCode.ADM_EXCHANGE_ROOM_NOT_FOUND);
        }

        Object[] r = roomRows.get(0);

        // 교환일기 목록
        @SuppressWarnings("unchecked")
        List<Object[]> diaryRows = em.createNativeQuery("""
                SELECT ed.id, ed.author_id, u.nickname,
                       SUBSTRING(ed.content, 1, 100), ed.turn_number, ed.created_at
                FROM exchange_diaries ed
                JOIN users u ON ed.author_id = u.id
                WHERE ed.exchange_room_id = :roomId
                ORDER BY ed.turn_number ASC
                """)
                .setParameter("roomId", roomId)
                .getResultList();

        List<AdminExchangeRoomDetailResponse.ExchangeDiaryItem> diaries = diaryRows.stream()
                .map(d -> new AdminExchangeRoomDetailResponse.ExchangeDiaryItem(
                        ((Number) d[0]).longValue(),
                        ((Number) d[1]).longValue(),
                        (String) d[2],
                        (String) d[3],
                        ((Number) d[4]).intValue(),
                        d[5] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) d[5]).toLocalDateTime()
                ))
                .toList();

        return new AdminExchangeRoomDetailResponse(
                ((Number) r[0]).longValue(),
                (UUID) r[1],
                ((Number) r[2]).longValue(),
                (String) r[3],
                ((Number) r[4]).longValue(),
                (String) r[5],
                (String) r[6],
                ((Number) r[7]).intValue(),
                ((Number) r[8]).intValue(),
                ((Number) r[9]).longValue(),
                r[10] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[10]).toLocalDateTime(),
                r[11] == null ? null : (r[11] instanceof LocalDateTime ldt2 ? ldt2 : ((java.sql.Timestamp) r[11]).toLocalDateTime()),
                r[12] == null ? null : ((Number) r[12]).longValue(),
                r[13] == null ? null : ((Number) r[13]).longValue(),
                r[14] instanceof LocalDateTime ldt3 ? ldt3 : ((java.sql.Timestamp) r[14]).toLocalDateTime(),
                diaries
        );
    }
}
