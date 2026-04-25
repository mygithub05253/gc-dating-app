package com.ember.ember.admin.dto.socialauth;

import com.ember.ember.admin.domain.socialauth.SocialLoginErrorLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 소셜 로그인 오류 통계/이력 DTO 모음 (명세 v2.3 §7.6 Step 6).
 */
public final class SocialLoginErrorDto {

    private SocialLoginErrorDto() {}

    /**
     * 실시간 오류율 통계 응답.
     *
     * @param provider          제공자 (KAKAO)
     * @param period            집계 윈도우 (예: "1h")
     * @param totalCount        해당 윈도우 내 총 오류 건수
     * @param affectedUserCount 영향 받은 고유 사용자 수
     * @param errorTypeCounts   오류 유형별 카운트 (TOKEN_EXPIRED → 12, ...)
     * @param resolutionCounts  해결 상태별 카운트 (AUTO_RECOVERED → 8, ...)
     * @param errorRate         오류율 (0~1, frontend가 % 표기)
     * @param severity          NORMAL / WARN / CRITICAL — 명세 임계값 (5%, 15%) 기준
     */
    public record ErrorStatsResponse(
            String provider,
            String period,
            long totalCount,
            long affectedUserCount,
            Map<String, Long> errorTypeCounts,
            Map<String, Long> resolutionCounts,
            Double errorRate,
            String severity
    ) {}

    /** 단건 오류 이력 항목. */
    public record ErrorLogItem(
            Long id,
            String provider,
            SocialLoginErrorLog.ErrorType errorType,
            String errorCode,
            SocialLoginErrorLog.ResolutionStatus resolutionStatus,
            Long userId,
            String requestIp,
            LocalDateTime occurredAt,
            String errorMessage
    ) {
        public static ErrorLogItem of(SocialLoginErrorLog log) {
            return new ErrorLogItem(
                    log.getId(),
                    log.getProvider(),
                    log.getErrorType(),
                    log.getErrorCode(),
                    log.getResolutionStatus(),
                    log.getUserId(),
                    log.getRequestIp(),
                    log.getOccurredAt(),
                    log.getErrorMessage()
            );
        }
    }

    /** 오류 이력 페이지네이션 응답. */
    public record ErrorHistoryResponse(
            List<ErrorLogItem> items,
            long totalElements,
            int totalPages,
            int page,
            int size
    ) {}
}
