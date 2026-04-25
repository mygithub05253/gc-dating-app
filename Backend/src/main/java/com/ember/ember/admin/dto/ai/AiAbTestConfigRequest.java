package com.ember.ember.admin.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * AI A/B 테스트 설정 요청 — §8 AI 관리 (SUPER_ADMIN 전용).
 * 현재 스텁 구현.
 */
@Schema(description = "AI A/B 테스트 설정 요청")
public record AiAbTestConfigRequest(
        @NotBlank @Size(max = 100)
        @Schema(description = "테스트명") String testName,
        @Schema(description = "활성화 여부") boolean enabled,
        @Schema(description = "컨트롤 그룹 비율 (0~100)") int controlGroupPercent,
        @Schema(description = "설명") String description
) {}
