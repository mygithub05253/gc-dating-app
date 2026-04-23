package com.ember.ember.admin.dto.report;

import com.ember.ember.report.domain.Report;

/**
 * 관리자 신고 맥락 조회 응답 — 관리자 API v2.1 §5.6.
 * 신고 대상 콘텐츠(일기/교환일기/채팅메시지/프로필)의 원문 일부를 반환한다.
 * <p>
 * Phase A-3 1차에서는 스펙의 최소 필드만 반환하고, 실제 원문 조회 구현은 2차에서 연계.
 * 이 DTO 는 스펙 형상을 확정해 둠.
 */
public record AdminReportContextResponse(
        Long reportId,
        Report.ContextType contextType,
        Long contextId,
        String evidenceContent,
        String note
) {}
