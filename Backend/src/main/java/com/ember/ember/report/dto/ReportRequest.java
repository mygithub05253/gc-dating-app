package com.ember.ember.report.dto;

import com.ember.ember.report.domain.Report;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "사용자 신고 요청")
public record ReportRequest(

        @Schema(description = "신고 사유", example = "HARASSMENT")
        @NotNull(message = "신고 사유는 필수입니다.")
        Report.ReportReason reason,

        @Schema(description = "맥락 타입 (신고 발생 위치)", example = "CHAT_MESSAGE")
        Report.ContextType contextType,

        @Schema(description = "맥락 ID (해당 콘텐츠 ID)", example = "42")
        Long contextId,

        @Schema(description = "상세 설명 (최대 500자)", example = "부적절한 메시지를 반복 전송")
        @Size(max = 500, message = "상세 설명은 500자 이하여야 합니다.")
        String detail
) {
}
