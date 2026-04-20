package com.ember.ember.diary.dto;

import java.util.List;

/** 일기 목록 응답 */
public record DiaryListResponse(
        List<DiaryListItem> diaries,
        int totalCount,
        boolean hasNext
) {
    /** 일기 목록 항목 */
    public record DiaryListItem(
            Long diaryId,
            String contentPreview,
            String createdAt,
            String summary,
            String category
    ) {}
}
