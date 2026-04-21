package com.ember.ember.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "차단/차단 해제 응답")
public record BlockResponse(

        @Schema(description = "성공 여부")
        boolean success,

        @Schema(description = "처리 일시")
        LocalDateTime processedAt
) {
    public static BlockResponse of(LocalDateTime processedAt) {
        return new BlockResponse(true, processedAt);
    }
}
