package com.ember.ember.matching.dto;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
public class MatchingSelectResponse {

    private Long matchingId;
    private boolean isMatched;
    private String roomUuid;
}
