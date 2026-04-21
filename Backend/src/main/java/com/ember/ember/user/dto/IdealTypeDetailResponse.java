package com.ember.ember.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "이상형 키워드 상세 조회 응답 (마이페이지)")
public record IdealTypeDetailResponse(

        @Schema(description = "선택된 키워드 목록")
        List<KeywordItem> keywords,

        @Schema(description = "최대 선택 가능 수")
        int maxSelectable,

        @Schema(description = "다음 수정 가능 일시 (null이면 즉시 수정 가능)")
        LocalDateTime nextEditableAt
) {

    @Schema(description = "키워드 정보")
    public record KeywordItem(
            Long id,
            String text,
            String type
    ) {
    }
}
