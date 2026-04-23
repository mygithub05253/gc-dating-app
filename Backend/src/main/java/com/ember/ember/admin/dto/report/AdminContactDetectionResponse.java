package com.ember.ember.admin.dto.report;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.report.domain.ContactDetection;

import java.time.LocalDateTime;

/**
 * 외부 연락처 감지 응답 — 관리자 API v2.1 §5.10.
 * 프런트 `/admin/reports/contacts` Mock 과 동일한 형상.
 */
public record AdminContactDetectionResponse(
        Long id,
        Long userId,
        String nickname,
        ContactDetection.ContentType contentType,
        Long contentId,
        String detectedText,
        ContactDetection.PatternType patternType,
        String context,
        ContactDetection.Status status,
        ContactDetection.ActionType actionType,
        Integer confidence,
        String adminMemo,
        LocalDateTime detectedAt,
        String reviewedByName,
        LocalDateTime reviewedAt
) {
    public static AdminContactDetectionResponse from(ContactDetection d) {
        AdminAccount reviewer = d.getReviewedBy();
        return new AdminContactDetectionResponse(
                d.getId(),
                d.getUser().getId(),
                d.getUser().getNickname(),
                d.getContentType(),
                d.getContentId(),
                d.getDetectedText(),
                d.getPatternType(),
                d.getContext(),
                d.getStatus(),
                d.getActionType(),
                d.getConfidence(),
                d.getAdminMemo(),
                d.getDetectedAt(),
                reviewer == null ? null : reviewer.getName(),
                d.getReviewedAt()
        );
    }
}
