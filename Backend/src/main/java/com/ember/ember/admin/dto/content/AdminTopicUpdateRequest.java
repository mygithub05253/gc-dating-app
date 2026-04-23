package com.ember.ember.admin.dto.content;

import com.ember.ember.topic.domain.WeeklyTopic;
import jakarta.validation.constraints.Size;

public record AdminTopicUpdateRequest(
        @Size(max = 200) String topic,
        WeeklyTopic.Category category,
        Boolean isActive
) {}
