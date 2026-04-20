package com.ember.ember.content.service;

import com.ember.ember.content.client.ContentScanClient;
import com.ember.ember.content.client.ContentScanResponse;
import com.ember.ember.content.exception.ContentScanRemoteException;
import com.ember.ember.content.service.ContentScanResult.BlockedReason;
import com.ember.ember.observability.metric.AiMetrics;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 콘텐츠 검열 서비스 (M3 실제 구현).
 *
 * 검열 플로우:
 *   1. FastAPI /api/content/scan 동기 호출 (3초 타임아웃)
 *   2. 정상 응답 → FastAPI 결과 기반 ContentScanResult 반환
 *   3. 타임아웃 / 5xx / 네트워크 오류 (ContentScanRemoteException) 발생 →
 *      WARN 로그 후 Silent Fail: 로컬 정규식 검사만으로 판단
 *      (로컬 검사도 차단 조건이면 차단 — 무조건 허용이 아님)
 *
 * 로컬 정규식 검사 항목:
 *   - 금칙어 Set (BannedWordCacheService → Redis BANNED_WORDS:ALL → DB fallback)
 *   - URL 화이트리스트 (UrlWhitelistCacheService → Redis URL_WHITELIST → DB fallback)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentScanService {

    // URL 추출 정규식
    private static final Pattern URL_PATTERN =
        Pattern.compile("https?://[^\\s]+", Pattern.CASE_INSENSITIVE);

    private final ContentScanClient contentScanClient;
    private final BannedWordCacheService bannedWordCacheService;
    private final UrlWhitelistCacheService urlWhitelistCacheService;
    private final AiMetrics aiMetrics;

    /**
     * 일기 본문 검열.
     *
     * @param content 검열할 텍스트 (일기 본문)
     * @return 검열 결과 (isAllowed: true=정상 / false=차단)
     */
    public ContentScanResult scan(String content) {
        // ai.content.scan.duration Timer 측정 (fallback 발동 여부 태그)
        Timer.Sample sample = Timer.start();
        boolean isFallback = false;

        try {
            // ── 1. FastAPI 동기 호출 ────────────────────────────────────────
            ContentScanResponse remote = contentScanClient.scan(content);

            if (!remote.allowed()) {
                // FastAPI가 차단 판정
                List<BlockedReason> reasons = remote.blockedReasons().stream()
                    .map(r -> new BlockedReason(r.category(), r.matchedToken()))
                    .collect(Collectors.toList());

                String summary = reasons.isEmpty()
                    ? "FastAPI 차단 판정"
                    : reasons.get(0).category() + ": " + reasons.get(0).matchedToken();

                log.info("[CONTENT_SCAN] 차단 — 사유: {}", summary);
                return ContentScanResult.blocked(summary, reasons);
            }

            // FastAPI가 허용 판정
            return ContentScanResult.allowed();

        } catch (ContentScanRemoteException e) {
            // ── 2. Silent Fail: 로컬 정규식 검사로 fallback ─────────────────
            log.warn("[CONTENT_SCAN] Silent Fail — FastAPI 호출 실패, 로컬 검사로 전환: {}",
                e.getMessage());
            isFallback = true;
            return localRegexScan(content);

        } finally {
            // fallback 발동 여부를 태그로 기록
            sample.stop(aiMetrics.contentScanTimer(String.valueOf(isFallback)));
        }
    }

    /**
     * 로컬 정규식 검열 (Silent Fail fallback).
     *
     * 검사 순서:
     *   1. 금칙어 포함 여부 (단순 contains, PARTIAL 모드 기준)
     *   2. URL 추출 → 화이트리스트 미포함 도메인 존재 여부
     *
     * @param content 검열할 텍스트
     * @return 검열 결과
     */
    private ContentScanResult localRegexScan(String content) {
        List<BlockedReason> reasons = new ArrayList<>();

        // ── 1. 금칙어 검사 ───────────────────────────────────────────────────
        try {
            Set<String> bannedWords = bannedWordCacheService.getBannedWords();
            for (String word : bannedWords) {
                if (content.contains(word)) {
                    reasons.add(new BlockedReason("BANNED_WORD", word));
                    log.debug("[CONTENT_SCAN][LOCAL] 금칙어 탐지: {}", word);
                    // 첫 금칙어 발견 즉시 차단 (성능 최적화 — 이후 검사 생략 가능하지만 사유 수집을 위해 계속)
                }
            }
        } catch (Exception e) {
            log.warn("[CONTENT_SCAN][LOCAL] 금칙어 조회 실패 — 금칙어 검사 생략: {}", e.getMessage());
        }

        // ── 2. URL 화이트리스트 검사 ─────────────────────────────────────────
        try {
            Set<String> whitelist = urlWhitelistCacheService.getUrlWhitelist();
            Matcher urlMatcher = URL_PATTERN.matcher(content);

            while (urlMatcher.find()) {
                String foundUrl = urlMatcher.group();
                String domain = extractDomain(foundUrl);

                boolean isWhitelisted = whitelist.stream()
                    .anyMatch(allowed -> domain.equals(allowed) || domain.endsWith("." + allowed));

                if (!isWhitelisted) {
                    reasons.add(new BlockedReason("FORBIDDEN_URL", foundUrl));
                    log.debug("[CONTENT_SCAN][LOCAL] 비허용 URL 탐지: {}", foundUrl);
                }
            }
        } catch (Exception e) {
            log.warn("[CONTENT_SCAN][LOCAL] URL 화이트리스트 조회 실패 — URL 검사 생략: {}",
                e.getMessage());
        }

        // ── 3. 최종 판정 ─────────────────────────────────────────────────────
        if (!reasons.isEmpty()) {
            String summary = reasons.get(0).category() + ": " + reasons.get(0).matchedToken();
            log.info("[CONTENT_SCAN][LOCAL] 차단 — 사유 {}건, 대표: {}", reasons.size(), summary);
            return ContentScanResult.blocked(summary, reasons);
        }

        log.debug("[CONTENT_SCAN][LOCAL] 로컬 검사 통과 — 허용");
        return ContentScanResult.allowed();
    }

    /**
     * URL 문자열에서 도메인(호스트명)을 추출한다.
     * 예: "https://www.kakao.com/talk" → "www.kakao.com"
     *
     * @param url 추출 대상 URL
     * @return 도메인 문자열 (실패 시 원본 URL 반환)
     */
    private String extractDomain(String url) {
        try {
            // "https://" 또는 "http://" 제거 후 첫 "/" 앞까지
            String withoutScheme = url.replaceFirst("https?://", "");
            int slashIdx = withoutScheme.indexOf('/');
            return slashIdx >= 0 ? withoutScheme.substring(0, slashIdx) : withoutScheme;
        } catch (Exception e) {
            return url;
        }
    }
}
