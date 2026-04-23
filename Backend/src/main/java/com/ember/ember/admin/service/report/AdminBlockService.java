package com.ember.ember.admin.service.report;

import com.ember.ember.admin.dto.report.AdminBlockListItemResponse;
import com.ember.ember.admin.dto.report.AdminBlockStatsResponse;
import com.ember.ember.report.domain.Block;
import com.ember.ember.report.repository.BlockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자 차단 관리 서비스 — 관리자 API v2.1 §5.8~§5.9.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBlockService {

    private final BlockRepository blockRepository;

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
}
