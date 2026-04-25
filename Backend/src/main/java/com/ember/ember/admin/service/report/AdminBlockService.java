package com.ember.ember.admin.service.report;

import com.ember.ember.admin.dto.report.AdminBlockListItemResponse;
import com.ember.ember.admin.dto.report.AdminBlockStatsResponse;
import com.ember.ember.admin.dto.report.ConcentratedTargetResponse;
import com.ember.ember.report.domain.Block;
import com.ember.ember.report.repository.BlockRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 차단 관리 서비스 — 관리자 API v2.1 §5.8~§5.9.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBlockService {

    private final BlockRepository blockRepository;
    private final EntityManager em;

    /** §5.8 차단 이력 페이지 조회. */
    public Page<AdminBlockListItemResponse> list(Block.BlockStatus status, Pageable pageable) {
        return blockRepository.findAllForAdmin(status, pageable)
                .map(AdminBlockListItemResponse::from);
    }

    /** §5.9 차단 통계 + 집중 대상 TOP N. */
    public AdminBlockStatsResponse stats(int topN) {
        int safeTop = Math.max(3, Math.min(topN, 50));

        long active = blockRepository.countByStatus(Block.BlockStatus.ACTIVE);
        long unblocked = blockRepository.countByStatus(Block.BlockStatus.UNBLOCKED);
        long adminCancelled = blockRepository.countByStatus(Block.BlockStatus.ADMIN_CANCELLED);

        List<AdminBlockStatsResponse.ConcentratedTarget> concentrated = blockRepository
                .findConcentratedTargets(PageRequest.of(0, safeTop))
                .stream()
                .map(row -> new AdminBlockStatsResponse.ConcentratedTarget(
                        (Long) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();

        return new AdminBlockStatsResponse(active, unblocked, adminCancelled, concentrated);
    }

    /**
     * 차단 집중 대상 조회 — 특정 기간 내 minBlockCount 이상 차단받은 사용자.
     */
    public Page<ConcentratedTargetResponse> concentratedTargets(String period, int minBlockCount, Pageable pageable) {
        int days = "30d".equalsIgnoreCase(period) ? 30 : 7;
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        String sql = """
                SELECT b.blocked_user_id, u.nickname, COUNT(*) AS block_count
                FROM blocks b
                JOIN users u ON b.blocked_user_id = u.id
                WHERE b.created_at >= :since
                GROUP BY b.blocked_user_id, u.nickname
                HAVING COUNT(*) >= :minBlockCount
                ORDER BY block_count DESC
                """;

        String countSql = """
                SELECT COUNT(*) FROM (
                    SELECT b.blocked_user_id
                    FROM blocks b
                    WHERE b.created_at >= :since
                    GROUP BY b.blocked_user_id
                    HAVING COUNT(*) >= :minBlockCount
                ) sub
                """;

        Query query = em.createNativeQuery(sql)
                .setParameter("since", since)
                .setParameter("minBlockCount", (long) minBlockCount);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        Query cntQuery = em.createNativeQuery(countSql)
                .setParameter("since", since)
                .setParameter("minBlockCount", (long) minBlockCount);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        long total = ((Number) cntQuery.getSingleResult()).longValue();

        List<ConcentratedTargetResponse> content = rows.stream()
                .map(r -> new ConcentratedTargetResponse(
                        ((Number) r[0]).longValue(),
                        (String) r[1],
                        ((Number) r[2]).longValue()))
                .toList();

        return new PageImpl<>(content, pageable, total);
    }
}
