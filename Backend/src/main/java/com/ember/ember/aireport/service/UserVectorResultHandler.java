package com.ember.ember.aireport.service;

import com.ember.ember.cache.service.CacheService;
import com.ember.ember.idealtype.domain.UserVector;
import com.ember.ember.idealtype.repository.UserVectorRepository;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.event.AiAnalysisResultEvent.VectorResult;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

/**
 * 사용자 임베딩 벡터 생성 결과 처리 핸들러 (M6).
 * AiResultConsumer에서 USER_VECTOR_GENERATED / USER_VECTOR_FAILED 수신 시 호출.
 *
 * 완료 처리:
 *   1. Base64 디코딩 → byte[] 변환 (768차원 fp16, 1536 bytes)
 *   2. user_vectors UPSERT (SharedPK 패턴: 기존 행 있으면 update, 없으면 create)
 *
 * 실패 처리:
 *   WARN 로그만 (MatchingService에서 다음 요청 시 재예약 가능)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserVectorResultHandler {

    /** 추천 결과 fresh 캐시 키 패턴 (MatchingService와 동일 규칙) */
    private static final String CACHE_KEY_MATCHING_RECO = "MATCHING:RECO:%d";

    /** 추천 결과 stale 캐시 키 패턴 */
    private static final String CACHE_KEY_MATCHING_RECO_STALE = "MATCHING:RECO:stale:%d";

    private final UserVectorRepository userVectorRepository;
    private final UserRepository userRepository;
    private final CacheService cacheService;

    /**
     * 사용자 벡터 생성 완료 처리.
     *
     * @param event USER_VECTOR_GENERATED 이벤트
     */
    @Transactional
    public void handleGenerated(AiAnalysisResultEvent event) {
        Long userId = event.userId();
        VectorResult vectorResult = event.vectorResult();

        if (userId == null || vectorResult == null) {
            log.warn("[UserVectorResultHandler] userId 또는 vectorResult 누락 — messageId={}",
                    event.messageId());
            return;
        }

        String embeddingBase64 = vectorResult.embeddingBase64();
        if (embeddingBase64 == null || embeddingBase64.isBlank()) {
            log.warn("[UserVectorResultHandler] embeddingBase64 비어 있음 — userId={}", userId);
            return;
        }

        // ── 1. Base64 디코딩 ──────────────────────────────────────────────
        byte[] embeddingBytes;
        try {
            embeddingBytes = Base64.getDecoder().decode(embeddingBase64);
        } catch (IllegalArgumentException e) {
            log.error("[UserVectorResultHandler] Base64 디코딩 실패 — userId={}", userId, e);
            return;
        }

        // ── 2. EmbeddingSource 파싱 ───────────────────────────────────────
        UserVector.EmbeddingSource source;
        try {
            source = UserVector.EmbeddingSource.valueOf(vectorResult.source());
        } catch (IllegalArgumentException e) {
            log.warn("[UserVectorResultHandler] 알 수 없는 EmbeddingSource — source={}, userId={}",
                    vectorResult.source(), userId);
            // 소스 파싱 실패 시 DIARY로 fallback
            source = UserVector.EmbeddingSource.DIARY;
        }

        // ── 3. user_vectors UPSERT (SharedPK 패턴) ───────────────────────
        final UserVector.EmbeddingSource finalSource = source;
        userVectorRepository.findByUserId(userId)
                .ifPresentOrElse(
                        existing -> {
                            // 기존 행 갱신
                            existing.update(embeddingBytes, finalSource);
                            userVectorRepository.save(existing);
                            log.debug("[UserVectorResultHandler] 벡터 갱신 완료 — userId={}, source={}",
                                    userId, finalSource);
                        },
                        () -> {
                            // 신규 생성
                            User user = userRepository.findById(userId).orElse(null);
                            if (user == null) {
                                log.warn("[UserVectorResultHandler] 사용자 없음 (벡터 저장 불가) — userId={}", userId);
                                return;
                            }
                            UserVector newVector = UserVector.create(user, embeddingBytes, finalSource);
                            userVectorRepository.save(newVector);
                            log.debug("[UserVectorResultHandler] 벡터 신규 생성 완료 — userId={}, source={}",
                                    userId, finalSource);
                        }
                );

        log.info("[UserVectorResultHandler] 사용자 벡터 처리 완료 — userId={}, dimension={}, source={}",
                userId, vectorResult.dimension(), finalSource);

        // ── 4. MATCHING:RECO:{userId} fresh/stale 캐시 무효화 ─────────────────
        // 새 임베딩이 저장됐으므로 기존 추천 결과 캐시는 낡은 벡터 기반 → 즉시 무효화.
        // 다음 매칭 요청 시 최신 임베딩으로 재계산.
        String freshKey = String.format(CACHE_KEY_MATCHING_RECO, userId);
        String staleKey = String.format(CACHE_KEY_MATCHING_RECO_STALE, userId);
        cacheService.invalidate(freshKey);
        cacheService.invalidate(staleKey);
        log.debug("[UserVectorResultHandler] MATCHING:RECO 캐시 무효화 완료 — userId={}", userId);
    }

    /**
     * 사용자 벡터 생성 실패 처리.
     * WARN 로그만 기록 (MatchingService의 다음 요청 시 자동 재예약).
     *
     * @param event USER_VECTOR_FAILED 이벤트
     */
    public void handleFailed(AiAnalysisResultEvent event) {
        log.warn("[UserVectorResultHandler] 사용자 벡터 생성 실패 — userId={}, errorCode={}",
                event.userId(),
                event.error() != null ? event.error().code() : "unknown");
    }
}
