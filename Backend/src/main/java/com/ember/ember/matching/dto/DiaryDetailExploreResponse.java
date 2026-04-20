package com.ember.ember.matching.dto;

import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class DiaryDetailExploreResponse {

    private Long diaryId;
    private Long authorId;
    private String ageGroupLabel;
    private String content;
    private String summary;
    private List<String> keywords;
    private List<String> moodTags;
    private String category;
    private String createdAt;
    private String similarityBadge;
    private List<OtherDiaryPreview> otherDiariesPreview;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OtherDiaryPreview {
        private Long diaryId;
        private String summary;
        private String createdAt;
    }
}
