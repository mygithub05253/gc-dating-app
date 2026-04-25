package com.ember.ember.admin.dto.report;

import com.ember.ember.admin.domain.report.UserReportRestriction;

import java.time.LocalDateTime;

/**
 * 허위 신고 반복자 제한 응답 DTO.
 */
public record ReportRestrictionResponse(
        Long restrictionId,
        Long userId,
        LocalDateTime restrictedUntil,
        Long adminId,
        String memo,
        LocalDateTime createdAt
) {
    public static ReportRestrictionResponse from(UserReportRestriction r) {
        return new ReportRestrictionResponse(
                r.getId(),
                r.getUserId(),
                r.getRestrictedUntil(),
                r.getAdminId(),
                r.getMemo(),
                r.getCreatedAt()
        );
    }
}
