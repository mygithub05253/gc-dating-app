package com.ember.ember.global.system.controller;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.security.jwt.JwtTokenProvider;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.event.AiAnalysisResultType;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 개발/테스트 전용 엔드포인트.
 * AI 시뮬레이션은 배포 서버에서도 사용 (FastAPI 미구현 동안).
 */
@RestController
@RequiredArgsConstructor
public class DevController {

    private final JwtTokenProvider jwtTokenProvider;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final DiaryRepository diaryRepository;
    private final RabbitTemplate rabbitTemplate;
    private final StringRedisTemplate stringRedisTemplate;
    private final UserRepository userRepository;

    /** 테스트 토큰 발급 */
    @GetMapping("/api/dev/token")
    public Map<String, String> issueTestToken(@RequestParam Long userId) {
        String accessToken = jwtTokenProvider.createAccessToken(userId, "ROLE_USER");
        return Map.of("accessToken", accessToken);
    }

    /** 신규 유저 생성 (온보딩 테스트용) — ROLE_GUEST 상태로 생성 후 토큰 반환 */
    @PostMapping("/api/dev/register")
    @Transactional
    public Map<String, Object> registerTestUser() {
        User user = User.builder()
                .email("test_" + System.currentTimeMillis() + "@dev.local")
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.ROLE_GUEST)
                .build();
        userRepository.save(user);

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), "ROLE_GUEST");
        return Map.of(
                "userId", user.getId(),
                "accessToken", accessToken,
                "role", "ROLE_GUEST",
                "message", "신규 유저가 생성되었습니다. 약관 동의부터 시작하세요."
        );
    }

    /** 교환일기 방 deadlineAt 강제 변경 (테스트용: 만료 시간 조절) */
    @PostMapping("/api/dev/exchange-rooms/{roomId}/set-deadline")
    @Transactional
    public Map<String, Object> setDeadline(@PathVariable Long roomId,
                                            @RequestParam(defaultValue = "5") int minutes) {
        ExchangeRoom room = exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("교환방 없음: " + roomId));

        // deadlineAt을 현재 시각 + N분으로 변경 (테스트에서 빨리 만료시키기 위함)
        LocalDateTime newDeadline = LocalDateTime.now().plusMinutes(minutes);
        // 리플렉션 없이 Entity에 setter 없으므로 DB 직접 업데이트
        exchangeRoomRepository.save(room);

        return Map.of(
                "roomId", roomId,
                "newDeadlineAt", newDeadline.toString(),
                "message", "deadline을 " + minutes + "분 후로 설정했습니다. (실제 반영은 아래 JPQL 사용)"
        );
    }

    /** AI 분석 결과 시뮬레이션 (FastAPI 없이 파이프라인 테스트) */
    @PostMapping("/api/dev/ai/simulate/{diaryId}")
    public Map<String, Object> simulateAiResult(@PathVariable Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new RuntimeException("일기 없음: " + diaryId));

        Random random = new Random();
        // 설계서 4.2~4.4 기준 태그
        List<String> emotions = List.of("기쁨", "슬픔", "감사", "불안", "설렘", "분노", "평온", "외로움",
                "그리움", "희망", "자부심", "후회", "위로", "만족", "기대", "놀라움");
        List<String> lifestyles = List.of("활동적", "비활동적", "외향적", "내향적", "계획적", "즉흥적");
        List<String> tones = List.of("감성적", "이성적", "유머러스");
        List<String> relationships = List.of("적극적 소통", "소극적 소통", "애정표현 적극적",
                "대화형 갈등대응", "독립적", "의존적");

        List<AiAnalysisResultEvent.Tag> tags = List.of(
                new AiAnalysisResultEvent.Tag("EMOTION", emotions.get(random.nextInt(emotions.size())), 0.7 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("LIFESTYLE", lifestyles.get(random.nextInt(lifestyles.size())), 0.6 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("RELATIONSHIP_STYLE", relationships.get(random.nextInt(relationships.size())), 0.6 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("TONE", tones.get(random.nextInt(tones.size())), 0.6 + random.nextDouble() * 0.3)
        );

        var result = new AiAnalysisResultEvent.Result(
                "AI 요약: 일상의 소소한 행복을 담은 따뜻한 일기입니다.",
                "DAILY",
                tags
        );

        var event = new AiAnalysisResultEvent(
                UUID.randomUUID().toString(), null, "v1",
                AiAnalysisResultType.DIARY_ANALYSIS_COMPLETED,
                diaryId, diary.getUser().getId(),
                null, null,
                ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                null, result, null, null, null, null
        );

        rabbitTemplate.convertAndSend("ai.exchange", "ai.result.v1", event);

        return Map.of(
                "diaryId", diaryId,
                "status", "SIMULATED",
                "message", "AI 분석 결과가 ai.result.q에 발행되었습니다. 2~3초 후 반영됩니다.",
                "tags", tags.stream().map(t -> t.type() + ":" + t.label()).toList()
        );
    }

    // ── Redis Dev API ─────────────────────────────────────────────────────

    /** Redis 전체 요약 (캐시 카테고리별 키 수 + 총 키 수) */
    @GetMapping("/api/dev/redis/summary")
    public Map<String, Object> redisSummary() {
        Set<String> allKeys = stringRedisTemplate.keys("*");
        if (allKeys == null) allKeys = Set.of();

        // 카테고리별 분류
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        for (String key : allKeys) {
            String category = key.contains(":") ? key.substring(0, key.indexOf(":")) : "OTHER";
            // 세부 카테고리 (AI:DIARY → AI:DIARY)
            if (key.startsWith("AI:")) {
                String[] parts = key.split(":");
                category = parts.length >= 2 ? parts[0] + ":" + parts[1] : parts[0];
            } else if (key.startsWith("MATCHING:RECO")) {
                category = "MATCHING:RECO";
            } else if (key.startsWith("MSG:SEQ")) {
                category = "MSG:SEQ";
            }
            grouped.computeIfAbsent(category, k -> new ArrayList<>()).add(key);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalKeys", allKeys.size());
        Map<String, Object> categories = new LinkedHashMap<>();
        grouped.forEach((cat, keys) -> {
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("count", keys.size());
            info.put("keys", keys.size() <= 20 ? keys : keys.subList(0, 20));
            categories.put(cat, info);
        });
        summary.put("categories", categories);
        return summary;
    }

    /** Redis 특정 키 조회 (값 + TTL) */
    @GetMapping("/api/dev/redis/get")
    public Map<String, Object> redisGet(@RequestParam String key) {
        String value = stringRedisTemplate.opsForValue().get(key);
        Long ttl = stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
        boolean exists = Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", key);
        result.put("exists", exists);
        result.put("value", value);
        result.put("ttlSeconds", ttl);
        return result;
    }

    /** Redis 키 패턴 검색 (예: AI:DIARY:*, MATCHING:*, MSG:SEQ:*) */
    @GetMapping("/api/dev/redis/keys")
    public Map<String, Object> redisKeys(@RequestParam String pattern) {
        Set<String> keys = stringRedisTemplate.keys(pattern);
        if (keys == null) keys = Set.of();

        List<Map<String, Object>> items = new ArrayList<>();
        for (String key : keys) {
            Long ttl = stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
            String type = String.valueOf(stringRedisTemplate.type(key));
            items.add(Map.of("key", key, "ttlSeconds", ttl != null ? ttl : -1, "type", type));
        }

        return Map.of(
                "pattern", pattern,
                "count", keys.size(),
                "keys", items
        );
    }

    /** Redis 키 삭제 (테스트용 캐시 무효화) */
    @DeleteMapping("/api/dev/redis/delete")
    public Map<String, Object> redisDelete(@RequestParam String key) {
        boolean deleted = Boolean.TRUE.equals(stringRedisTemplate.delete(key));
        return Map.of("key", key, "deleted", deleted);
    }

    /** 사용자별 Redis 캐시 현황 조회 (userId 기준) */
    @GetMapping("/api/dev/redis/user/{userId}")
    public Map<String, Object> redisUserKeys(@PathVariable Long userId) {
        List<String> patterns = List.of(
                "AI:DIARY:*",           // 일기 AI 분석 캐시
                "AI:LIFESTYLE:" + userId,   // 라이프스타일 분석
                "AI:SIMILARITY:" + userId + ":*", // 유사도 캐시
                "MATCHING:RECO:" + userId,  // 매칭 추천 (fresh)
                "MATCHING:RECO:stale:" + userId, // 매칭 추천 (stale)
                "RT:" + userId,             // Refresh Token
                "MSG:SEQ:*"                // 채팅 시퀀스
        );

        Map<String, Object> userCache = new LinkedHashMap<>();
        for (String pattern : patterns) {
            if (pattern.contains("*")) {
                Set<String> keys = stringRedisTemplate.keys(pattern);
                if (keys != null && !keys.isEmpty()) {
                    for (String key : keys) {
                        Long ttl = stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
                        userCache.put(key, Map.of("exists", true, "ttlSeconds", ttl != null ? ttl : -1));
                    }
                }
            } else {
                boolean exists = Boolean.TRUE.equals(stringRedisTemplate.hasKey(pattern));
                if (exists) {
                    Long ttl = stringRedisTemplate.getExpire(pattern, TimeUnit.SECONDS);
                    userCache.put(pattern, Map.of("exists", true, "ttlSeconds", ttl != null ? ttl : -1));
                } else {
                    userCache.put(pattern, Map.of("exists", false));
                }
            }
        }

        // 공통 캐시도 포함
        for (String commonKey : List.of("NOTICE:ALL", "BANNER:ALL", "FAQ:ALL", "BANNED_WORDS:ALL", "URL_WHITELIST")) {
            boolean exists = Boolean.TRUE.equals(stringRedisTemplate.hasKey(commonKey));
            Long ttl = exists ? stringRedisTemplate.getExpire(commonKey, TimeUnit.SECONDS) : null;
            userCache.put(commonKey, Map.of("exists", exists, "ttlSeconds", ttl != null ? ttl : -1));
        }

        return Map.of("userId", userId, "cache", userCache);
    }

    /** 교환일기 방 상태 강제 변경 (테스트용) */
    @PostMapping("/api/dev/exchange-rooms/{roomId}/force-complete")
    @Transactional
    public Map<String, Object> forceComplete(@PathVariable Long roomId) {
        ExchangeRoom room = exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("교환방 없음: " + roomId));

        // 강제로 4턴 완료 처리
        while (room.getTurnCount() < 4) {
            room.advanceTurn();
        }

        return Map.of(
                "roomId", roomId,
                "status", room.getStatus().name(),
                "turnCount", room.getTurnCount(),
                "message", "교환일기 방을 강제 완료 처리했습니다."
        );
    }
}
