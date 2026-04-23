package com.ember.ember.admin.dto.content;

import com.ember.ember.content.domain.ExchangeDiaryGuideStep;

public record AdminGuideStepResponse(
        Long id,
        Integer stepOrder,
        String stepTitle,
        String description,
        String imageUrl,
        Boolean isActive
) {
    public static AdminGuideStepResponse from(ExchangeDiaryGuideStep s) {
        return new AdminGuideStepResponse(
                s.getId(), s.getStepOrder(), s.getStepTitle(),
                s.getDescription(), s.getImageUrl(), s.getIsActive());
    }
}
