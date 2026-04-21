package com.ember.ember.report.dto;

import com.ember.ember.report.domain.Appeal;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "이의신청 응답")
public record AppealResponse(

        @Schema(description = "이의신청 ID")
        Long appealId,

        @Schema(description = "상태 (PENDING)")
        String status,

        @Schema(description = "신청 일시")
        LocalDateTime submittedAt
) {
    public static AppealResponse from(Appeal appeal) {
        return new AppealResponse(appeal.getId(), appeal.getStatus().name(), appeal.getCreatedAt());
    }
}
