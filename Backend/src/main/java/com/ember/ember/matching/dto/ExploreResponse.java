package com.ember.ember.matching.dto;

import lombok.*;

import java.util.List;

@Getter
@AllArgsConstructor
public class ExploreResponse {

    private List<ExploreDiaryItem> diaries;
    private Long nextCursor;
    private boolean hasNext;
    private String guidanceMessage;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ExploreDiaryItem {
        private Long diaryId;
        private Long authorId;
        private String ageGroupLabel;
        private String region;
        private String previewContent;
        private String category;
        private String createdAt;
        private String similarityBadge;
    }
}
