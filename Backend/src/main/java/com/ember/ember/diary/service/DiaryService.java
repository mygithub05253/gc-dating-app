package com.ember.ember.diary.service;

import com.ember.ember.content.service.ContentScanResult;
import com.ember.ember.content.service.ContentScanService;
import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.dto.DiaryCreateRequest;
import com.ember.ember.diary.dto.DiaryCreateResponse;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.messaging.event.DiaryAnalyzeRequestedEvent;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 일기 도메인 서비스.
 * 일기 생성 → OutboxEvent 저장 → AI 분석 파이프라인 트리거 흐름을 담당.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DiaryService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final DiaryRepository diaryRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final UserRepository userRepository;
    private final ContentScanService contentScanService;
    private final ObjectMapper objectMapper;
    private final AiMetrics aiMetrics;

    /**
     * 일기 생성 트랜잭션.
     *
     * 처리 순서:
     *   1. content 글자 수 검증 (100자 미만 → 예외)
     *   2. ContentScanService 검열 (M3 스텁: 항상 통과)
     *   3. 하루 1개 중복 검사
     *   4. Diary 엔티티 생성 (analysisStatus=PENDING)
     *   5. OutboxEvent 생성 (eventType=DIARY_ANALYZE_REQUESTED)
     *   6. 응답 반환
     *
     * @param userId 인증된 사용자 PK
     * @param req    일기 생성 요청 DTO
     * @return 생성된 일기 정보 응답
     */
    @Transactional
    public DiaryCreateResponse createDiary(Long userId, DiaryCreateRequest req) {
        // ai.diary.analyze.duration Timer 측정 시작 (생성 ~ Outbox 저장 완료 구간)
        Timer.Sample sample = Timer.start();
        String timerResult = "success";

        try {
            // 1. content 최소 글자 수 검증 (Bean Validation에서 처리되지만 도메인 레이어에서도 보장)
            if (req.content().length() < 100) {
                timerResult = "fail";
                throw new BusinessException(ErrorCode.DIARY_CONTENT_LENGTH);
            }

            // 2. 컨텐츠 검열 (M3 스텁: 항상 통과)
            ContentScanResult scanResult = contentScanService.scan(req.content());
            if (!scanResult.isAllowed()) {
                log.warn("[DiaryService] 컨텐츠 검열 차단 — userId={}, reason={}", userId, scanResult.reason());
                timerResult = "fail";
                throw new BusinessException(ErrorCode.CONTENT_FILTERED);
            }

            // 3. 하루 1개 중복 검사
            LocalDate today = LocalDate.now(KST);
            if (diaryRepository.existsByUserIdAndDate(userId, today)) {
                timerResult = "fail";
                throw new BusinessException(ErrorCode.DIARY_DAILY_LIMIT);
            }

            // 4. User 조회 및 Diary 엔티티 생성
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

            Diary diary = Diary.create(user, req.content(), req.visibility());
            diaryRepository.save(diary);

            // 5. OutboxEvent 생성: AI 분석 요청 페이로드 직렬화
            String messageId = UUID.randomUUID().toString();
            String publishedAt = ZonedDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

            DiaryAnalyzeRequestedEvent analyzeEvent = new DiaryAnalyzeRequestedEvent(
                    messageId,
                    DiaryAnalyzeRequestedEvent.VERSION,
                    diary.getId(),
                    userId,
                    req.content(),
                    publishedAt,
                    null  // traceparent: Micrometer Tracing이 자동 주입
            );

            String payload = serializeToJson(analyzeEvent);
            OutboxEvent outboxEvent = OutboxEvent.of("DIARY", diary.getId(),
                    "DIARY_ANALYZE_REQUESTED", payload);
            outboxEventRepository.save(outboxEvent);

            log.info("[DiaryService] 일기 생성 완료 — diaryId={}, userId={}, outboxEventId={}",
                    diary.getId(), userId, outboxEvent.getId());

            // 6. 응답 반환
            return DiaryCreateResponse.of(diary.getId(), diary.getStatus(), diary.getAnalysisStatus());

        } finally {
            // Timer 기록 (성공/실패 공통)
            sample.stop(aiMetrics.diaryAnalyzeTimer(timerResult));
        }
    }

    /**
     * 객체를 JSON 문자열로 직렬화.
     * 직렬화 실패 시 내부 서버 에러로 처리.
     */
    private String serializeToJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("[DiaryService] OutboxEvent 페이로드 직렬화 실패 — 이유={}", e.getMessage());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }
}
