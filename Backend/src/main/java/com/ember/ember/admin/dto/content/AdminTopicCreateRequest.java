package com.ember.ember.admin.dto.content;

import com.ember.ember.topic.domain.WeeklyTopic;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AdminTopicCreateRequest(
        @NotBlank @Size(max = 200) String topic,
        @NotNull WeeklyTopic.Category category,
        @NotNull LocalDate weekStartDate,
        Boolean isActive
) {}
