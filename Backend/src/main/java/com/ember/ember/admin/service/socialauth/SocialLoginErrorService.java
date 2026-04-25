package com.ember.ember.admin.service.socialauth;

import com.ember.ember.admin.domain.socialauth.SocialLoginErrorLog;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto.ErrorHistoryResponse;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto.ErrorLogItem;
import com.ember.ember.admin.dto.socialauth.SocialLoginErrorDto.ErrorStatsResponse;
import com.ember.ember.admin.repository.socialauth.SocialLoginErrorLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 소셜 로그인 오류 통계·이력 서비스 (명세 v2.3 §7.6).
 *
 * <p>Phase 2-A 범위</p>
 * <ul>
 *   <li>오류 적재 ({@link #recordError}) — 사용자 도메인 인증 실패 핸들러가 호출</li>
 *   <li>실시간 통계 조회 ({@link #getStats})</li>
 *   <li>오류 이력 조회 ({@link #getHistory})</li>
 * </ul>
 *
 * <p><b>분모 카운터 미연동 한계</b>: 명세 §7.6의 5%/15% 임계값은 전체 로그인 시도 수 분모가 필요하다.
 * 시도 수 카운터는 인증 도메인 측에서 발행해야 하므로 본 PR에서는 절대 오류 카운트만 노출하고
 * {@code errorRate}/{@code severity}는 {@code null}로 반환한다. 분모 카운터 도입은 후속 PR로 이연.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SocialLoginErrorService {

    private static final int MAX_PAGE_SIZE = 100;

    /** ISO duration 표기 일부 + 사용자 친화 표현 (1h, 24h, 7d 등) 모두 지원. */
    private static final Pattern PERIOD_PATTERN = Pattern.compile("^(\\d+)([mhd])$");

    private final SocialLoginErrorLogRepository errorLogRepository;

    // -------------------------------------------------------------------------
    // 적재
    // -------------------------------------------------------------------------

    /** 사용자 인증 실패 시 호출. 토큰 원본은 절대 인자로 받지 않는다 (명세 §7.6 Security). */
    @Transactional
    public Long recordError(String provider, SocialLoginErrorLog.ErrorType errorType,
                            String errorCode, SocialLoginErrorLog.ResolutionStatus resolutionStatus,
                            Long userId, String requestIp, String errorMessage) {
        SocialLoginErrorLog log = SocialLoginErrorLog.builder()
                .provider(provider)
                .errorType(errorType)
                .errorCode(errorCode)
                .resolutionStatus(resolutionStatus)
                .userId(userId)
                .requestIp(requestIp)
                .errorMessage(errorMessage)
                .build();
        SocialLoginErrorLog saved = errorLogRepository.save(log);
        return saved.getId();
    }

    // -------------------------------------------------------------------------
    // 통계
    // -------------------------------------------------------------------------

    public ErrorStatsResponse getStats(String period) {
        String safeProvider = "KAKAO";
        String safePeriod = period != null && !period.isBlank() ? period : "1h";
        Duration window = parsePeriod(safePeriod);
        LocalDateTime threshold = LocalDateTime.now().minus(window);

        long total = errorLogRepository.countByProviderAndOccurredAtAfter(safeProvider, threshold);
        long affectedUsers = errorLogRepository.countDistinctUsers(safeProvider, threshold);

        Map<String, Long> typeCounts = new LinkedHashMap<>();
        for (Object[] row : errorLogRepository.countGroupByErrorType(safeProvider, threshold)) {
            typeCounts.put(((SocialLoginErrorLog.ErrorType) row[0]).name(),
                    ((Number) row[1]).longValue());
        }
        Map<String, Long> resolutionCounts = new LinkedHashMap<>();
        for (Object[] row : errorLogRepository.countGroupByResolution(safeProvider, threshold)) {
            resolutionCounts.put(((SocialLoginErrorLog.ResolutionStatus) row[0]).name(),
                    ((Number) row[1]).longValue());
        }

        return new ErrorStatsResponse(
                safeProvider,
                safePeriod,
                total,
                affectedUsers,
                typeCounts,
                resolutionCounts,
                null, // 분모 카운터 미연동 (후속 PR에서 채움)
                null
        );
    }

    // -------------------------------------------------------------------------
    // 이력
    // -------------------------------------------------------------------------

    public ErrorHistoryResponse getHistory(String provider, SocialLoginErrorLog.ErrorType errorType,
                                           LocalDateTime startDate, LocalDateTime endDate,
                                           int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        LocalDateTime safeStart = startDate != null ? startDate : LocalDateTime.now().minusDays(1);
        LocalDateTime safeEnd = endDate != null ? endDate : LocalDateTime.now();

        Page<SocialLoginErrorLog> result = errorLogRepository.searchHistory(
                provider, errorType, safeStart, safeEnd, pageable);

        List<ErrorLogItem> items = new ArrayList<>(result.getNumberOfElements());
        for (SocialLoginErrorLog log : result.getContent()) {
            items.add(ErrorLogItem.of(log));
        }
        return new ErrorHistoryResponse(
                items,
                result.getTotalElements(),
                result.getTotalPages(),
                safePage,
                safeSize);
    }

    // -------------------------------------------------------------------------
    // 헬퍼
    // -------------------------------------------------------------------------

    private Duration parsePeriod(String period) {
        Matcher m = PERIOD_PATTERN.matcher(period);
        if (!m.matches()) {
            log.warn("[SocialLoginErrorService] 알 수 없는 period 표기 — fallback 1h. value={}", period);
            return Duration.ofHours(1);
        }
        long value = Long.parseLong(m.group(1));
        String unit = m.group(2);
        return switch (unit) {
            case "m" -> Duration.ofMinutes(value);
            case "h" -> Duration.ofHours(value);
            case "d" -> Duration.ofDays(value);
            default  -> Duration.ofHours(1);
        };
    }
}
