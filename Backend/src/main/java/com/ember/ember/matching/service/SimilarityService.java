package com.ember.ember.matching.service;

import com.ember.ember.idealtype.domain.UserVector;
import com.ember.ember.idealtype.repository.UserVectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.time.Duration;
import java.util.Optional;

/**
 * 사용자 간 유사도 계산 서비스.
 * UserVector(768차원 fp16)를 기반으로 코사인 유사도를 계산하고 배지를 반환.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimilarityService {

    private static final String CACHE_PREFIX = "AI:SIMILARITY:";
    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final UserVectorRepository userVectorRepository;
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * 두 사용자 간 유사도 배지 반환.
     * 0.7 이상: "잘 맞을 것 같아요", 0.5~0.7: "공통점이 있어요", 0.5 미만: null
     */
    public String getSimilarityBadge(Long userA, Long userB) {
        try {
            // Redis 캐시 우선 조회
            String cacheKey = CACHE_PREFIX + Math.min(userA, userB) + ":" + Math.max(userA, userB);
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return cached.equals("null") ? null : cached;
            }

            // 벡터 조회
            Optional<UserVector> vecA = userVectorRepository.findByUserId(userA);
            Optional<UserVector> vecB = userVectorRepository.findByUserId(userB);

            if (vecA.isEmpty() || vecB.isEmpty()) {
                return null;
            }

            // 코사인 유사도 계산
            double similarity = cosineSimilarity(vecA.get().getEmbedding(), vecB.get().getEmbedding());
            String badge = toBadge(similarity);

            // 캐시 저장
            redisTemplate.opsForValue().set(cacheKey, badge != null ? badge : "null", CACHE_TTL);

            log.debug("[유사도] userA={}, userB={}, score={}, badge={}", userA, userB, similarity, badge);
            return badge;
        } catch (Exception e) {
            log.warn("[유사도] 계산 실패 (무시) — {}", e.getMessage());
            return null;
        }
    }

    /** 코사인 유사도 (fp16 byte[] → float[] → cosine) */
    private double cosineSimilarity(byte[] embA, byte[] embB) {
        float[] a = fp16ToFloat(embA);
        float[] b = fp16ToFloat(embB);

        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0 : dot / denom;
    }

    /** fp16 바이트 배열 → float 배열 변환 */
    private float[] fp16ToFloat(byte[] bytes) {
        ByteBuffer buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        float[] result = new float[bytes.length / 2];
        for (int i = 0; i < result.length; i++) {
            result[i] = Float.float16ToFloat(buf.getShort());
        }
        return result;
    }

    /** 유사도 → 배지 텍스트 */
    private String toBadge(double similarity) {
        if (similarity >= 0.7) return "잘 맞을 것 같아요";
        if (similarity >= 0.5) return "공통점이 있어요";
        return null;
    }
}
