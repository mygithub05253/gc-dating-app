package com.ember.ember.admin.dto.content;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * §6.7 교환일기 가이드 단계 전체 교체 요청.
 * 트랜잭션으로 기존 단계 전부 삭제 후 새 단계 INSERT.
 */
public record AdminGuideStepsUpdateRequest(
        @NotNull @Valid List<Step> steps
) {
    public record Step(
            @NotNull Integer stepOrder,
            @NotBlank @Size(max = 100) String stepTitle,
            @NotBlank String description,
            @Size(max = 500) String imageUrl,
            Boolean isActive
    ) {}
}
