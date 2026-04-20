package com.ember.ember.diary.dto;

import java.util.List;

/** 일기 상세 조회 응답 */
public record DiaryDetailResponse(
        Long diaryId,
        String content,
        String createdAt,
        String summary,
        String category,
        List<TagItem> emotionTags,
        List<TagItem> lifestyleTags,
        List<TagItem> toneTags,
        boolean isEditable
) {
    /** AI 태그 항목 */
    public record TagItem(
            String label,
            double score
    ) {}
}
