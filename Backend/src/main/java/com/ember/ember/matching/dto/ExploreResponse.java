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
    private String currentSort;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ExploreDiaryItem {
        private Long diaryId;
        private Long authorId;
        private String ageGroupLabel;
        private String sido;
        private String sigungu;
        private String previewContent;
        private String category;
        private String createdAt;
        private String similarityBadge;
        private List<String> personalityKeywords;
        private List<String> moodTags;
    }
}
