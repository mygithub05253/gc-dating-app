package com.ember.ember.admin.dto.content;

import com.ember.ember.content.domain.ExampleDiary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminExampleDiaryCreateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(min = 200, max = 1000) String content,
        @NotNull ExampleDiary.Category category,
        @NotNull ExampleDiary.DisplayTarget displayTarget,
        Integer displayOrder,
        Boolean isActive
) {}
