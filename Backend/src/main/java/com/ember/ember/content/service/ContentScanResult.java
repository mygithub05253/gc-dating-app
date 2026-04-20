package com.ember.ember.content.service;

import java.util.List;

/**
 * 컨텐츠 검열 결과.
 *
 * @param isAllowed      허용 여부 (true: 정상, false: 차단)
 * @param reason         단일 차단 이유 요약 (isAllowed=false일 때만 유효)
 * @param blockedReasons 세부 차단 사유 목록 (카테고리 + 매칭 토큰)
 */
public record ContentScanResult(
    boolean isAllowed,
    String reason,
    List<BlockedReason> blockedReasons
) {

    /**
     * 개별 차단 사유 (카테고리 + 매칭된 토큰).
     *
     * @param category     차단 카테고리 (예: BANNED_WORD, FORBIDDEN_URL, EXTERNAL_CONTACT_PHONE 등)
     * @param matchedToken 실제 매칭된 문자열
     */
    public record BlockedReason(String category, String matchedToken) {}

    /** 허용 결과 팩토리 메서드 */
    public static ContentScanResult allowed() {
        return new ContentScanResult(true, null, List.of());
    }

    /** 단일 사유 차단 결과 팩토리 메서드 */
    public static ContentScanResult blocked(String reason) {
        return new ContentScanResult(false, reason, List.of());
    }

    /** 세부 사유 포함 차단 결과 팩토리 메서드 */
    public static ContentScanResult blocked(String reason, List<BlockedReason> blockedReasons) {
        return new ContentScanResult(false, reason, blockedReasons);
    }
}
