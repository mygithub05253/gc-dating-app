package com.ember.ember.admin.dto.report;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 허위 신고 반복자 제한 요청 DTO.
 */
public record ReportRestrictionRequest(
        @Min(1)
        Integer durationHours,

        @NotBlank
        @Size(min = 10, message = "관리자 메모는 최소 10자 이상이어야 합니다.")
        String adminMemo
) {
    public ReportRestrictionRequest {
        if (durationHours == null) durationHours = 48;
    }
}
