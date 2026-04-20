package com.ember.ember.idealtype.dto;

import com.ember.ember.idealtype.domain.Keyword;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

@Schema(description = "키워드 정보")
public record KeywordResponse(

        @Schema(description = "키워드 ID")
        Long id,

        @Schema(description = "키워드 레이블", example = "계획적")
        String label,

        @Schema(description = "카테고리", example = "LIFESTYLE")
        String category,

        @Schema(description = "매칭 가중치")
        BigDecimal weight,

        @Schema(description = "UI 노출 순서")
        int displayOrder
) {
    public static KeywordResponse from(Keyword keyword) {
        return new KeywordResponse(
                keyword.getId(),
                keyword.getLabel(),
                keyword.getCategory(),
                keyword.getWeight(),
                keyword.getDisplayOrder()
        );
    }
}
