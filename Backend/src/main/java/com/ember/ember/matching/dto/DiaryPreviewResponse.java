package com.ember.ember.matching.dto;

import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class DiaryPreviewResponse {

    private Long diaryId;
    private String ageGroup;
    private String preview;
    private List<String> keywords;
    private List<String> tags;
    private String aiIntro;
    private String category;
    private Double matchScore;
    private String similarityBadge;
}
