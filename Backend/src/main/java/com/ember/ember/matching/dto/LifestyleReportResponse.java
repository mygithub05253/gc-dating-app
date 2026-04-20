package com.ember.ember.matching.dto;

import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class LifestyleReportResponse {

    private boolean analysisAvailable;
    private int requiredDiaryCount;
    private int currentDiaryCount;
    private List<ActivityHeatmapItem> activityHeatmap;
    private WeekdayPattern weekdayPattern;
    private Double emotionGraph;
    private Integer avgDiaryLength;
    private List<String> commonKeywords;
    private String aiDescription;
    private List<String> lifestyleTags;
    private String guidanceMessage;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class ActivityHeatmapItem {
        private int hour;
        private int day;
        private int count;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class WeekdayPattern {
        private int weekday;
        private int weekend;
    }
}
