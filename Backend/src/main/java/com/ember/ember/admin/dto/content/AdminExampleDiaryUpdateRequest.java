package com.ember.ember.admin.dto.content;

import com.ember.ember.content.domain.ExampleDiary;
import jakarta.validation.constraints.Size;

public record AdminExampleDiaryUpdateRequest(
        @Size(max = 100) String title,
        @Size(min = 200, max = 1000) String content,
        ExampleDiary.Category category,
        ExampleDiary.DisplayTarget displayTarget,
        Integer displayOrder,
        Boolean isActive
) {}
