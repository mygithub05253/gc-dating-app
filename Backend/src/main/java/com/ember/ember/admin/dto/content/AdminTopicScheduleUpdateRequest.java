package com.ember.ember.admin.dto.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * §6.5 주제 스케줄 override 요청.
 */
public record AdminTopicScheduleUpdateRequest(
        @NotNull Long topicId,
        @NotBlank @Size(min = 1, max = 500) String overrideReason
) {}
