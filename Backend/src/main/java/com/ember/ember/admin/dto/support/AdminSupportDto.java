package com.ember.ember.admin.dto.support;

import com.ember.ember.notification.domain.Inquiry;
import com.ember.ember.report.domain.Appeal;
import com.ember.ember.report.domain.SanctionHistory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * 관리자 고객지원 DTO 모음 (명세 v2.1 §17).
 */
public final class AdminSupportDto {

    private AdminSupportDto() {}

    // ── 요청 DTO ──────────────────────────────────────────────

    /** 문의 답변 요청 */
    public record InquiryReplyRequest(
            @NotBlank String answer
    ) {}

    /** 이의신청 결정 요청 */
    public record AppealResolveRequest(
            @NotNull Appeal.AppealDecision decision,
            @NotBlank String decisionReason
    ) {}

    // ── 응답 DTO ──────────────────────────────────────────────

    /** 문의 목록/상세 응답 */
    public record InquiryResponse(
            Long id,
            Long userId,
            String userNickname,
            String category,
            String title,
            String content,
            Inquiry.InquiryStatus status,
            String answer,
            Long answeredById,
            String answeredByName,
            LocalDateTime answeredAt,
            LocalDateTime closedAt,
            LocalDateTime createdAt,
            LocalDateTime modifiedAt
    ) {
        public static InquiryResponse from(Inquiry i) {
            return new InquiryResponse(
                    i.getId(),
                    i.getUser().getId(),
                    i.getUser().getNickname(),
                    i.getCategory(),
                    i.getTitle(),
                    i.getContent(),
                    i.getStatus(),
                    i.getAnswer(),
                    i.getAnsweredBy() != null ? i.getAnsweredBy().getId() : null,
                    i.getAnsweredBy() != null ? i.getAnsweredBy().getName() : null,
                    i.getAnsweredAt(),
                    i.getClosedAt(),
                    i.getCreatedAt(),
                    i.getModifiedAt()
            );
        }
    }

    /** 이의신청 목록/상세 응답 */
    public record AppealResponse(
            Long id,
            Long userId,
            String userNickname,
            Long sanctionId,
            String sanctionType,
            String sanctionReason,
            LocalDateTime sanctionDate,
            String reason,
            Appeal.AppealStatus status,
            Appeal.AppealDecision decision,
            String decisionReason,
            Long decidedById,
            String decidedByName,
            LocalDateTime decidedAt,
            LocalDateTime createdAt
    ) {
        public static AppealResponse from(Appeal a) {
            SanctionHistory s = a.getSanction();
            return new AppealResponse(
                    a.getId(),
                    a.getUser().getId(),
                    a.getUser().getNickname(),
                    s.getId(),
                    s.getSanctionType().name(),
                    s.getReason(),
                    s.getCreatedAt(),
                    a.getReason(),
                    a.getStatus(),
                    a.getDecision(),
                    a.getDecisionReason(),
                    a.getDecidedBy() != null ? a.getDecidedBy().getId() : null,
                    a.getDecidedBy() != null ? a.getDecidedBy().getName() : null,
                    a.getDecidedAt(),
                    a.getCreatedAt()
            );
        }
    }
}
