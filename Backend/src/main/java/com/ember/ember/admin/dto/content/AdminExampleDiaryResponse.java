package com.ember.ember.admin.dto.content;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.content.domain.ExampleDiary;

import java.time.LocalDateTime;

public record AdminExampleDiaryResponse(
        Long id,
        String title,
        String content,
        ExampleDiary.Category category,
        ExampleDiary.DisplayTarget displayTarget,
        Integer displayOrder,
        Boolean isActive,
        String createdByName,
        LocalDateTime createdAt
) {
    public static AdminExampleDiaryResponse from(ExampleDiary e) {
        AdminAccount admin = e.getCreatedBy();
        return new AdminExampleDiaryResponse(
                e.getId(), e.getTitle(), e.getContent(),
                e.getCategory(), e.getDisplayTarget(),
                e.getDisplayOrder(), e.getIsActive(),
                admin == null ? null : admin.getName(),
                e.getCreatedAt()
        );
    }
}
