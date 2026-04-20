package com.ember.ember.idealtype.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "이상형 키워드 설정 요청")
public record IdealTypeRequest(

        @Schema(description = "선택한 키워드 ID 목록 (최대 3개)")
        @NotEmpty(message = "키워드를 1개 이상 선택해야 합니다.")
        @Size(max = 3, message = "키워드는 최대 3개까지 선택 가능합니다.")
        List<Long> keywordIds
) {
}
