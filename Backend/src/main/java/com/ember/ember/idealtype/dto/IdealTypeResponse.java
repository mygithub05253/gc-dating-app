package com.ember.ember.idealtype.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "이상형 키워드 설정 응답")
public record IdealTypeResponse(

        @Schema(description = "저장된 키워드 ID 목록")
        List<Long> keywordIds,

        @Schema(description = "저장된 키워드 텍스트 목록")
        List<String> keywords
) {
}
