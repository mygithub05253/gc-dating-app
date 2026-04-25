package com.ember.ember.admin.dto.analytics;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 탈퇴 사유 상세 목록 응답 (페이징) -- 관리자 API v2.1 SS18.
 */
public record WithdrawalReasonResponse(
    List<WithdrawalItem> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    Meta meta
) {
    public record WithdrawalItem(
        Long id,
        Long userId,
        String reason,
        String detail,
        LocalDateTime withdrawnAt,
        LocalDateTime permanentDeleteAt
    ) {}

    public record Meta(boolean degraded, String source) {}
}
