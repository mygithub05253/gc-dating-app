package com.ember.ember.admin.service.content;

import com.ember.ember.admin.dto.content.AdminChatMessageResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리자 채팅 메시지 조회 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminChatMessageService {

    private final EntityManager em;

    /**
     * 채팅 메시지 목록 조회 (관리자 리뷰용).
     */
    public Page<AdminChatMessageResponse> list(Long chatRoomId, Long userId, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
                SELECT m.id, m.chat_room_id, m.sender_id, u.nickname,
                       m.content, m.type, m.sequence_id, m.is_flagged, m.created_at
                FROM messages m
                LEFT JOIN users u ON m.sender_id = u.id
                WHERE 1=1
                """);

        StringBuilder countSql = new StringBuilder("""
                SELECT COUNT(*) FROM messages m WHERE 1=1
                """);

        List<Object> params = new ArrayList<>();
        int paramIdx = 1;

        if (chatRoomId != null) {
            String clause = " AND m.chat_room_id = ?" + paramIdx;
            sql.append(clause);
            countSql.append(clause);
            params.add(chatRoomId);
            paramIdx++;
        }
        if (userId != null) {
            String clause = " AND m.sender_id = ?" + paramIdx;
            sql.append(clause);
            countSql.append(clause);
            params.add(userId);
            paramIdx++;
        }

        sql.append(" ORDER BY m.created_at DESC");

        Query query = em.createNativeQuery(sql.toString());
        Query countQuery = em.createNativeQuery(countSql.toString());

        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
            countQuery.setParameter(i + 1, params.get(i));
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        long total = ((Number) countQuery.getSingleResult()).longValue();

        List<AdminChatMessageResponse> content = rows.stream()
                .map(r -> new AdminChatMessageResponse(
                        ((Number) r[0]).longValue(),
                        ((Number) r[1]).longValue(),
                        r[2] == null ? null : ((Number) r[2]).longValue(),
                        (String) r[3],
                        (String) r[4],
                        (String) r[5],
                        ((Number) r[6]).longValue(),
                        (Boolean) r[7],
                        r[8] instanceof LocalDateTime ldt ? ldt : ((java.sql.Timestamp) r[8]).toLocalDateTime()
                ))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }
}
