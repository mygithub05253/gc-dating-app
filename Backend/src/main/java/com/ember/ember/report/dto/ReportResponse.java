package com.ember.ember.report.dto;

import com.ember.ember.report.domain.Report;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "신고 접수 응답")
public record ReportResponse(

        @Schema(description = "신고 ID")
        Long reportId,

        @Schema(description = "접수 일시")
        LocalDateTime reportedAt
) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(report.getId(), report.getCreatedAt());
    }
}
