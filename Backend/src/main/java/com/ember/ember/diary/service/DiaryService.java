package com.ember.ember.diary.service;

import com.ember.ember.content.service.ContentScanResult;
import com.ember.ember.content.service.ContentScanService;
import com.ember.ember.diary.domain.*;
import com.ember.ember.diary.dto.*;
import com.ember.ember.diary.repository.*;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.messaging.event.DiaryAnalyzeRequestedEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.topic.repository.WeeklyTopicRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 일기 도메인 서비스.
 * 결정 6: main 베이스 + feature AI 훅 주입 (ContentScan → DB INSERT → OutboxEvent).
 * main의 동기 summary/category 반환 로직 제거.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final DiaryDraftRepository diaryDraftRepository;
    private final DiaryEditLogRepository diaryEditLogRepository;
    private final DiaryKeywordRepository diaryKeywordRepository;
    private final WeeklyTopicRepository weeklyTopicRepository;
    private final UserRepository userRepository;
    private final UserActivityEventRepository userActivityEventRepository;
    // feature AI 훅 의존성
    private final ContentScanService contentScanService;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter ISO_KST = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** 당일 일기 작성 여부 확인 */
    public DiaryTodayResponse checkTodayDiary(Long userId) {
        LocalDate today = LocalDate.now(KST);
        return diaryRepository.findByUserIdAndDate(userId, today)
                .map(diary -> new DiaryTodayResponse(true, diary.getId()))
                .orElse(new DiaryTodayResponse(false, null));
    }

    /**
     * 일기 작성 - 결정 6 정밀 실행.
     *
     * 처리 순서:
     *   1. 사용자 조회
     *   2. 하루 1회 제한 검증
     *   3. topicId 검증 (nullable)
     *   4. ContentScanService.scan(content) 호출 (차단 시 BusinessException)
     *   5. Diary 저장 (analysisStatus = PENDING 초기화)
     *   6. 임시저장 자동 삭제 + 활동 로그 기록
     *   7. OutboxEvent 저장 (DIARY_ANALYZE_REQUESTED)
     *   8. DiaryCreateResponse.of(diary) 반환 (diaryId + status + analysisStatus만)
     */
    @Transactional
    public DiaryCreateResponse createDiary(Long userId, DiaryCreateRequest request) {
        // 1. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        LocalDate today = LocalDate.now(KST);

        // 2. 당일 1회 제한 검증
        if (diaryRepository.existsByUserIdAndDate(userId, today)) {
            throw new BusinessException(ErrorCode.DIARY_DAILY_LIMIT);
        }

        // 3. topicId 검증 (nullable)
        WeeklyTopic topic = null;
        if (request.topicId() != null) {
            topic = weeklyTopicRepository.findById(request.topicId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.TOPIC_NOT_FOUND));
        }

        // 4. ContentScan 검열 — 차단 시 예외
        ContentScanResult scanResult = contentScanService.scan(request.content());
        if (!scanResult.isAllowed()) {
            log.warn("[DiaryService] 컨텐츠 검열 차단 — userId={}, reason={}", userId, scanResult.reason());
            throw new BusinessException(ErrorCode.CONTENT_FILTERED);
        }

        // 5. Diary 저장 (analysisStatus = PENDING 초기화)
        Diary diary = Diary.builder()
                .user(user)
                .content(request.content())
                .date(today)
                .topic(topic)
                .build();
        diaryRepository.save(diary);

        // 6. 임시저장 자동 삭제 + 활동 로그 기록
        diaryDraftRepository.findByUserIdAndDeletedAtIsNullOrderBySavedDateDesc(userId)
                .forEach(DiaryDraft::softDelete);

        userActivityEventRepository.save(UserActivityEvent.builder()
                .user(user)
                .eventType("DIARY_WRITE")
                .targetType("DIARY")
                .targetId(diary.getId())
                .detail("{\"topicId\":" + request.topicId() + ",\"wordCount\":" + request.content().length() + "}")
                .build());

        // 7. OutboxEvent 저장 (DIARY_ANALYZE_REQUESTED)
        String messageId = UUID.randomUUID().toString();
        String publishedAt = ZonedDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        DiaryAnalyzeRequestedEvent analyzeEvent = new DiaryAnalyzeRequestedEvent(
                messageId,
                DiaryAnalyzeRequestedEvent.VERSION,
                diary.getId(),
                userId,
                request.content(),
                publishedAt,
                null  // traceparent: Micrometer Tracing이 자동 주입
        );

        String payload = serializeToJson(analyzeEvent);
        OutboxEvent outboxEvent = OutboxEvent.of("DIARY", diary.getId(),
                "DIARY_ANALYZE_REQUESTED", payload);
        outboxEventRepository.save(outboxEvent);

        log.info("[DiaryService] 일기 생성 완료 — diaryId={}, userId={}, outboxEventId={}",
                diary.getId(), userId, outboxEvent.getId());

        // 8. 응답 반환 (diaryId + status + analysisStatus만)
        return DiaryCreateResponse.of(diary);
    }

    /** 일기 목록 조회 (페이징) */
    public DiaryListResponse getDiaries(Long userId, int page, int size) {
        size = Math.min(size, 50);
        Page<Diary> diaryPage = diaryRepository.findByUserIdOrderByDateDesc(userId, PageRequest.of(page, size));

        List<DiaryListResponse.DiaryListItem> items = diaryPage.getContent().stream()
                .map(diary -> new DiaryListResponse.DiaryListItem(
                        diary.getId(),
                        diary.getContent().length() > 50
                                ? diary.getContent().substring(0, 50)
                                : diary.getContent(),
                        diary.getCreatedAt().format(ISO_KST),
                        diary.getSummary(),
                        diary.getCategory()
                ))
                .collect(Collectors.toList());

        return new DiaryListResponse(items, (int) diaryPage.getTotalElements(), diaryPage.hasNext());
    }

    /** 일기 상세 조회 */
    public DiaryDetailResponse getDiary(Long userId, Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        // 소유권 검증
        if (!diary.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.DIARY_UNAUTHORIZED);
        }

        // AI 키워드 조회
        List<DiaryKeyword> keywords = diaryKeywordRepository.findByDiaryId(diaryId);

        List<DiaryDetailResponse.TagItem> emotionTags = filterTags(keywords, DiaryKeyword.TagType.EMOTION);
        List<DiaryDetailResponse.TagItem> lifestyleTags = filterTags(keywords, DiaryKeyword.TagType.LIFESTYLE);
        List<DiaryDetailResponse.TagItem> toneTags = filterTags(keywords, DiaryKeyword.TagType.TONE);

        return new DiaryDetailResponse(
                diary.getId(),
                diary.getContent(),
                diary.getCreatedAt().format(ISO_KST),
                diary.getSummary(),
                diary.getCategory(),
                emotionTags.isEmpty() ? null : emotionTags,
                lifestyleTags.isEmpty() ? null : lifestyleTags,
                toneTags.isEmpty() ? null : toneTags,
                diary.isEditable()
        );
    }

    /** 일기 수정 (당일만) */
    @Transactional
    public DiaryUpdateResponse updateDiary(Long userId, Long diaryId, DiaryUpdateRequest request) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DIARY_NOT_FOUND));

        // 소유권 검증
        if (!diary.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.DIARY_UNAUTHORIZED);
        }

        // 수정 가능 여부 검증
        if (!diary.isEditable()) {
            throw new BusinessException(ErrorCode.DIARY_NOT_EDITABLE);
        }

        // 수정 로그 저장
        diaryEditLogRepository.save(DiaryEditLog.builder()
                .diary(diary)
                .contentBefore(diary.getContent())
                .contentAfter(request.content())
                .editedAt(LocalDateTime.now())
                .build());

        // AI 키워드 초기화
        diaryKeywordRepository.deleteByDiaryId(diaryId);

        // 본문 수정
        diary.updateContent(request.content());

        // 활동 로그 기록
        userActivityEventRepository.save(UserActivityEvent.builder()
                .user(diary.getUser())
                .eventType("DIARY_EDIT")
                .targetType("DIARY")
                .targetId(diaryId)
                .detail("{\"wordCount\":" + request.content().length() + "}")
                .build());

        // AI 재분석 MQ 이벤트 발행 (OutboxEvent → OutboxRelay가 RabbitMQ로 릴레이)
        diary.resetAnalysisStatus(); // analysisStatus = PENDING
        String messageId = UUID.randomUUID().toString();
        String publishedAt = ZonedDateTime.now(KST).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        DiaryAnalyzeRequestedEvent analyzeEvent = new DiaryAnalyzeRequestedEvent(
                messageId,
                DiaryAnalyzeRequestedEvent.VERSION,
                diary.getId(),
                userId,
                request.content(),
                publishedAt,
                null
        );

        String payload = serializeToJson(analyzeEvent);
        OutboxEvent outboxEvent = OutboxEvent.of("DIARY", diary.getId(),
                "DIARY_ANALYZE_REQUESTED", payload);
        outboxEventRepository.save(outboxEvent);

        log.info("[DiaryService] 일기 수정 완료 + AI 재분석 요청 — diaryId={}, userId={}, outboxEventId={}",
                diary.getId(), userId, outboxEvent.getId());

        return new DiaryUpdateResponse(
                diary.getId(),
                diary.getContent(),
                LocalDateTime.now().format(ISO_KST),
                null
        );
    }

    /** 수요일 주제 조회 */
    public WeeklyTopicResponse getWeeklyTopic() {
        LocalDate today = LocalDate.now(KST);
        // 이번 주 월요일 구하기
        LocalDate mondayOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        boolean isWednesday = today.getDayOfWeek() == DayOfWeek.WEDNESDAY;

        return weeklyTopicRepository.findByWeekStartDateAndIsActiveTrue(mondayOfWeek)
                .map(topic -> new WeeklyTopicResponse(
                        topic.getId(),
                        topic.getTopic(),
                        topic.getCategory(),
                        isWednesday
                ))
                .orElse(new WeeklyTopicResponse(null, null, null, false));
    }

    /** 임시저장 목록 조회 */
    public DraftListResponse getDrafts(Long userId) {
        List<DiaryDraft> drafts = diaryDraftRepository.findByUserIdAndDeletedAtIsNullOrderBySavedDateDesc(userId);

        List<DraftResponse> items = drafts.stream()
                .map(draft -> new DraftResponse(
                        draft.getId(),
                        draft.getContent(),
                        draft.getCreatedAt().format(ISO_KST)
                ))
                .collect(Collectors.toList());

        return new DraftListResponse(items, items.size());
    }

    /** 임시저장 생성 */
    @Transactional
    public DraftResponse createDraft(Long userId, DraftCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 최대 3건 제한
        if (diaryDraftRepository.countByUserIdAndDeletedAtIsNull(userId) >= 3) {
            throw new BusinessException(ErrorCode.DRAFT_LIMIT_EXCEEDED);
        }

        // topicId 검증
        WeeklyTopic topic = null;
        if (request.topicId() != null) {
            topic = weeklyTopicRepository.findById(request.topicId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.TOPIC_NOT_FOUND));
        }

        DiaryDraft draft = DiaryDraft.builder()
                .user(user)
                .content(request.content())
                .savedDate(LocalDate.now(KST))
                .topic(topic)
                .build();

        diaryDraftRepository.save(draft);

        return new DraftResponse(
                draft.getId(),
                draft.getContent(),
                draft.getCreatedAt().format(ISO_KST)
        );
    }

    /** 임시저장 삭제 (소프트 딜리트) */
    @Transactional
    public void deleteDraft(Long userId, Long draftId) {
        DiaryDraft draft = diaryDraftRepository.findById(draftId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DRAFT_NOT_FOUND));

        if (!draft.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.DRAFT_NOT_FOUND);
        }

        if (draft.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.DRAFT_NOT_FOUND);
        }

        draft.softDelete();
    }

    /** AI 태그 필터링 */
    private List<DiaryDetailResponse.TagItem> filterTags(List<DiaryKeyword> keywords, DiaryKeyword.TagType type) {
        return keywords.stream()
                .filter(k -> k.getTagType() == type)
                .map(k -> new DiaryDetailResponse.TagItem(k.getLabel(), k.getScore().doubleValue()))
                .collect(Collectors.toList());
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
