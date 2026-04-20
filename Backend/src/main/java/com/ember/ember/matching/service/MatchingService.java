package com.ember.ember.matching.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.idealtype.domain.UserPersonalityKeyword;
import com.ember.ember.idealtype.domain.UserVector;
import com.ember.ember.idealtype.repository.UserIdealKeywordRepository;
import com.ember.ember.idealtype.repository.UserPersonalityKeywordRepository;
import com.ember.ember.idealtype.repository.UserVectorRepository;
import com.ember.ember.matching.client.*;
import com.ember.ember.matching.dto.RecommendationItem;
import com.ember.ember.matching.dto.RecommendationResponse;
import com.ember.ember.matching.exception.MatchingRemoteException;
import com.ember.ember.matching.exception.MatchingUnavailableException;
import com.ember.ember.messaging.event.UserVectorGenerateRequestedEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.ember.ember.observability.metric.AiMetrics;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 매칭 추천 서비스.
 *
 * 핵심 플로우:
 *   1. MATCHING:RECO:{userId} 캐시 조회 → 히트 시 즉시 반환 (FRESH)
 *   2. 캐시 미스: 후보 필터링 → 벡터/키워드 배치 로드 → FastAPI 호출 → top-10 컷
 *   3. 정상 응답: fresh/stale 캐시 동시 갱신 (10분/24시간)
 *   4. AI 장애: stale 캐시 폴백 (X-Degraded: true) → stale도 없으면 503
 *
 * Lazy 임베딩 생성 (M4 초기):
 *   - 기준 사용자 벡터 없음 → 이상형 키워드 join → FastAPI embed API 호출 → IDEAL_KEYWORDS 소스로 저장
 *   - 후보 사용자 벡터 없음 → 해당 후보 스킵 + USER_VECTOR_GENERATE_REQUESTED Outbox 이벤트 발행 (M6 처리)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingService {

    // 캐시 키 상수
    private static final String CACHE_KEY_FRESH = "MATCHING:RECO:%d";
    private static final String CACHE_KEY_STALE = "MATCHING:RECO:stale:%d";
    private static final Duration TTL_FRESH = Duration.ofMinutes(10);
    private static final Duration TTL_STALE = Duration.ofHours(24);

    // 추천 결과 top-N
    private static final int TOP_N = 10;

    private final CacheService cacheService;
    private final UserRepository userRepository;
    private final UserIdealKeywordRepository userIdealKeywordRepository;
    private final UserPersonalityKeywordRepository userPersonalityKeywordRepository;
    private final UserVectorRepository userVectorRepository;
    private final DiaryRepository diaryRepository;
    private final CandidateFilterService candidateFilterService;
    private final MatchingClient matchingClient;
    private final EmbedClient embedClient;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final AiMetrics aiMetrics;

    /**
     * 추천 결과 조회.
     * 캐시 히트 → FRESH 반환, 미스 → AI 계산, 장애 → STALE 폴백.
     *
     * @param userId 기준 사용자 PK
     * @return [RecommendationResponse, degraded 여부]
     */
    @Transactional
    public RecommendationResult getRecommendations(Long userId) {
        String freshKey = String.format(CACHE_KEY_FRESH, userId);
        String staleKey = String.format(CACHE_KEY_STALE, userId);

        // ── 1. Fresh 캐시 조회 ────────────────────────────────────────────────
        Optional<RecommendationResponse> cached = cacheService.get(freshKey, RecommendationResponse.class);
        if (cached.isPresent()) {
            log.debug("[Matching] 캐시 히트 — userId={}", userId);
            // 캐시 히트 Timer 기록
            Timer.Sample hitSample = Timer.start();
            hitSample.stop(aiMetrics.matchingCalculateTimer("hit"));
            return new RecommendationResult(cached.get(), false);
        }

        // ── 2. AI 계산 시도 ──────────────────────────────────────────────────
        Timer.Sample missSample = Timer.start();
        try {
            RecommendationResponse fresh = computeRecommendations(userId);

            // 정상 응답: fresh + stale 캐시 동시 갱신
            cacheService.set(freshKey, fresh, TTL_FRESH);
            cacheService.set(staleKey, fresh, TTL_STALE);
            log.info("[Matching] 추천 계산 완료 — userId={}, items={}", userId, fresh.getItems().size());
            missSample.stop(aiMetrics.matchingCalculateTimer("miss"));
            return new RecommendationResult(fresh, false);

        } catch (MatchingRemoteException | MatchingUnavailableException e) {
            // ── 3. AI 장애: stale 폴백 ────────────────────────────────────────
            log.warn("[Matching] AI 장애 — stale 폴백 시도, userId={}, 이유={}", userId, e.getMessage());
            Optional<RecommendationResponse> stale = cacheService.get(staleKey, RecommendationResponse.class);
            if (stale.isPresent()) {
                // source 필드를 STALE로 변경해 반환
                RecommendationResponse staleResponse = RecommendationResponse.builder()
                        .generatedAt(stale.get().getGeneratedAt())
                        .source("STALE")
                        .items(stale.get().getItems())
                        .build();
                missSample.stop(aiMetrics.matchingCalculateTimer("stale"));
                return new RecommendationResult(staleResponse, true);
            }

            // stale도 없음 → 503
            log.error("[Matching] stale 캐시도 없음 — 503 반환, userId={}", userId);
            missSample.stop(aiMetrics.matchingCalculateTimer("stale"));
            throw new MatchingUnavailableException();
        }
    }

    /**
     * FastAPI를 호출해 추천 결과를 계산한다.
     *
     * @param userId 기준 사용자 PK
     * @return top-10 추천 결과
     */
    private RecommendationResponse computeRecommendations(Long userId) {
        // ── 기준 사용자 로드 ──────────────────────────────────────────────────
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));

        // ── 후보 필터링 (이성, 연령, 활동, 차단 제외) ────────────────────────
        List<Long> candidateIds = candidateFilterService.findCandidates(currentUser);
        if (candidateIds.isEmpty()) {
            log.info("[Matching] 후보 없음 — userId={}", userId);
            return emptyResponse();
        }

        // ── 이상형 키워드 조회 ───────────────────────────────────────────────
        List<String> idealKeywordLabels = userIdealKeywordRepository.findByUserId(userId)
                .stream()
                .map(uik -> uik.getKeyword().getLabel())
                .collect(Collectors.toList());

        // ── 기준 사용자 임베딩 조회 / lazy 생성 ─────────────────────────────
        String userEmbeddingBase64 = resolveUserEmbedding(userId, currentUser, idealKeywordLabels);

        // ── 후보 벡터 + 퍼스널리티 키워드 배치 조회 ─────────────────────────
        Map<Long, UserVector> vectorMap = userVectorRepository.findAllByUserIdIn(candidateIds)
                .stream()
                .collect(Collectors.toMap(UserVector::getUserId, v -> v));

        Map<Long, List<String>> personalityMap = buildPersonalityKeywordMap(candidateIds);

        // ── 후보 페이로드 구성 ───────────────────────────────────────────────
        // 임베딩 없는 후보: 제외 + Outbox 이벤트 발행 (M6 처리)
        List<CandidatePayload> candidatePayloads = new ArrayList<>();
        List<Long> missingVectorUserIds = new ArrayList<>();

        for (Long candidateId : candidateIds) {
            UserVector vector = vectorMap.get(candidateId);
            if (vector == null) {
                missingVectorUserIds.add(candidateId);
                continue; // 임베딩 없는 후보는 이번 추천에서 제외
            }

            String embeddingBase64 = Base64.getEncoder().encodeToString(vector.getEmbedding());
            List<String> personalityKeywords = personalityMap.getOrDefault(candidateId, List.of());

            candidatePayloads.add(CandidatePayload.builder()
                    .userId(candidateId)
                    .embedding(embeddingBase64)
                    .personalityKeywords(personalityKeywords)
                    .build());
        }

        // 임베딩 없는 후보에 대해 Outbox 이벤트 발행 (M6에서 처리 예정)
        if (!missingVectorUserIds.isEmpty()) {
            log.info("[Matching] 임베딩 없는 후보 {}명 스킵, Outbox 이벤트 발행 예정", missingVectorUserIds.size());
            publishUserVectorGenerateEvents(missingVectorUserIds);
        }

        if (candidatePayloads.isEmpty()) {
            log.info("[Matching] 유효한 후보 없음 (모두 임베딩 미생성) — userId={}", userId);
            return emptyResponse();
        }

        // ── FastAPI 호출 ─────────────────────────────────────────────────────
        MatchingCalculateRequest request = MatchingCalculateRequest.builder()
                .userId(userId)
                .userEmbedding(userEmbeddingBase64)
                .idealKeywords(idealKeywordLabels)
                .candidates(candidatePayloads)
                .build();

        MatchingCalculateResponse aiResponse = matchingClient.calculate(request);

        // ── top-N 컷 + DTO 변환 ──────────────────────────────────────────────
        List<RecommendationItem> items = aiResponse.getScores().stream()
                .sorted(Comparator.comparingDouble(CandidateScore::getMatchingScore).reversed())
                .limit(TOP_N)
                .map(this::toRecommendationItem)
                .collect(Collectors.toList());

        return RecommendationResponse.builder()
                .generatedAt(LocalDateTime.now())
                .source("FRESH")
                .items(items)
                .build();
    }

    /**
     * 기준 사용자 임베딩을 조회하거나 lazy 생성한다.
     *
     * - DB에 벡터 있으면 Base64 반환
     * - 없으면 이상형 키워드 join → FastAPI embed → DB 저장 → Base64 반환
     * - 이상형 키워드도 없으면 null 반환 (FastAPI가 후보 임베딩 없이 키워드 비율만으로 계산)
     *
     * @param userId             기준 사용자 PK
     * @param currentUser        기준 사용자 엔티티
     * @param idealKeywordLabels 이상형 키워드 label 목록
     * @return Base64 인코딩 float16 임베딩 또는 null
     */
    private String resolveUserEmbedding(Long userId, User currentUser, List<String> idealKeywordLabels) {
        Optional<UserVector> existing = userVectorRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return Base64.getEncoder().encodeToString(existing.get().getEmbedding());
        }

        // 임베딩 없음 → lazy 생성 시도
        if (idealKeywordLabels.isEmpty()) {
            log.info("[Matching] 기준 사용자 임베딩 없음 + 이상형 키워드 없음 — userId={}, FastAPI가 키워드 전용 계산", userId);
            return null;
        }

        // 이상형 키워드 텍스트를 공백으로 join → KoSimCSE 임베딩 요청
        String joinedText = String.join(" ", idealKeywordLabels);
        log.info("[Matching] 기준 사용자 임베딩 lazy 생성 — userId={}, 이상형키워드 기반", userId);

        List<String> embeddingList = embedClient.embed(List.of(joinedText));
        String embeddingBase64 = embeddingList.get(0);
        byte[] embeddingBytes = Base64.getDecoder().decode(embeddingBase64);

        // DB에 저장 (IDEAL_KEYWORDS 소스)
        UserVector newVector = UserVector.create(currentUser, embeddingBytes, UserVector.EmbeddingSource.IDEAL_KEYWORDS);
        userVectorRepository.save(newVector);
        log.info("[Matching] 기준 사용자 임베딩 저장 완료 — userId={}", userId);

        return embeddingBase64;
    }

    /**
     * 후보 사용자 ID 목록의 퍼스널리티 키워드를 Map으로 구성한다.
     *
     * @param candidateIds 후보 사용자 PK 목록
     * @return userId → [label 목록] Map
     */
    private Map<Long, List<String>> buildPersonalityKeywordMap(List<Long> candidateIds) {
        List<UserPersonalityKeyword> keywords = userPersonalityKeywordRepository.findByUserIdIn(candidateIds);
        Map<Long, List<String>> map = new HashMap<>();
        for (UserPersonalityKeyword kw : keywords) {
            map.computeIfAbsent(kw.getUser().getId(), k -> new ArrayList<>()).add(kw.getLabel());
        }
        return map;
    }

    /**
     * CandidateScore → RecommendationItem DTO 변환.
     */
    private RecommendationItem toRecommendationItem(CandidateScore score) {
        return RecommendationItem.builder()
                .userId(score.getUserId())
                .matchingScore(score.getMatchingScore())
                .breakdown(score.getBreakdown() != null
                        ? RecommendationItem.ScoreBreakdown.builder()
                                .keywordOverlap(score.getBreakdown().getKeywordOverlap())
                                .cosineSimilarity(score.getBreakdown().getCosineSimilarity())
                                .build()
                        : null)
                .build();
    }

    /**
     * 빈 추천 결과 반환.
     */
    private RecommendationResponse emptyResponse() {
        return RecommendationResponse.builder()
                .generatedAt(LocalDateTime.now())
                .source("FRESH")
                .items(List.of())
                .build();
    }

    /** KST 시간대 상수 */
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** user_vector 생성용 최근 일기 조회 수 */
    private static final int VECTOR_DIARY_LIMIT = 3;

    /**
     * 임베딩 없는 후보 사용자에 대해 USER_VECTOR_GENERATE_REQUESTED Outbox 이벤트 발행.
     * OutboxRelay가 처리하여 FastAPI → KoSimCSE 임베딩 생성 → DB UPSERT.
     *
     * payload 구성:
     *   - source: DIARY (최근 일기 3편 본문 기반)
     *   - texts: 최근 COMPLETED 일기 3편 content 목록
     *   - 일기 없는 사용자: texts=[] 로 발행 (FastAPI가 빈 텍스트 처리)
     *
     * @param userIds 임베딩 미생성 사용자 PK 목록
     */
    private void publishUserVectorGenerateEvents(List<Long> userIds) {
        String publishedAt = ZonedDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        for (Long uid : userIds) {
            try {
                // 최근 COMPLETED 일기 3편 조회
                List<String> diaryTexts = diaryRepository
                        .findTopByUserIdAndAnalysisStatusOrderByDateDesc(
                                uid, com.ember.ember.diary.domain.Diary.AnalysisStatus.COMPLETED,
                                Pageable.ofSize(VECTOR_DIARY_LIMIT))
                        .stream()
                        .map(com.ember.ember.diary.domain.Diary::getContent)
                        .toList();

                UserVectorGenerateRequestedEvent requestEvent = new UserVectorGenerateRequestedEvent(
                        UUID.randomUUID().toString(),
                        "v1",
                        uid,
                        "DIARY",
                        diaryTexts,
                        publishedAt,
                        null
                );

                String payload = objectMapper.writeValueAsString(requestEvent);
                OutboxEvent event = OutboxEvent.of("USER", uid, "USER_VECTOR_GENERATE_REQUESTED", payload);
                outboxEventRepository.save(event);
                log.debug("[Matching] USER_VECTOR_GENERATE_REQUESTED 이벤트 저장 — userId={}, diaryCount={}",
                        uid, diaryTexts.size());

            } catch (JsonProcessingException e) {
                // Outbox 이벤트 발행 실패는 매칭 플로우에 영향 없음 — 경고 로그만
                log.warn("[Matching] USER_VECTOR_GENERATE_REQUESTED 이벤트 발행 실패 — userId={}", uid);
            }
        }
    }

    /**
     * 추천 결과 + degraded 여부를 묶는 값 객체.
     *
     * @param response  추천 응답 DTO
     * @param degraded  true이면 stale 캐시 폴백 (X-Degraded: true 헤더 필요)
     */
    public record RecommendationResult(RecommendationResponse response, boolean degraded) {}
}
