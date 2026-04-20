package com.ember.ember.content.client;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * FastAPI /api/content/scan 응답 DTO.
 *
 * 예시:
 * {
 *   "allowed": false,
 *   "blockedReasons": [
 *     {"category": "EXTERNAL_CONTACT_PHONE", "matchedToken": "010-1234-5678"}
 *   ]
 * }
 */
public record ContentScanResponse(
    @JsonProperty("allowed") boolean allowed,
    @JsonProperty("blockedReasons") List<BlockedReason> blockedReasons
) {

    /**
     * FastAPI가 반환하는 개별 차단 사유.
     */
    public record BlockedReason(
        @JsonProperty("category") String category,
        @JsonProperty("matchedToken") String matchedToken
    ) {}

    /** blockedReasons null 방어 */
    public List<BlockedReason> blockedReasons() {
        return blockedReasons != null ? blockedReasons : List.of();
    }
}
