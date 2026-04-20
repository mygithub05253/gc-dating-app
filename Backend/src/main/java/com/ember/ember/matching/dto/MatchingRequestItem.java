package com.ember.ember.matching.dto;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
public class MatchingRequestItem {

    private Long matchingId;
    private Long fromUserId;
    private String fromUserNickname;
    private String fromUserAgeGroup;
    private Long diaryId;
    private String diaryPreview;
    private String requestedAt;
}
