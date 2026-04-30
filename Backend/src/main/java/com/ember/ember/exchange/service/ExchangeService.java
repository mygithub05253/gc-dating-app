package com.ember.ember.exchange.service;

import com.ember.ember.aireport.domain.ExchangeReport;
import com.ember.ember.aireport.repository.ExchangeReportRepository;
import com.ember.ember.chat.domain.ChatRoom;
import com.ember.ember.chat.repository.ChatRoomRepository;
import com.ember.ember.exchange.domain.ExchangeDiary;
import com.ember.ember.exchange.domain.ExchangeDiary.ExchangeDiaryStatus;
import com.ember.ember.exchange.domain.ExchangeDiary.Reaction;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.domain.ExchangeRoom.RoomStatus;
import com.ember.ember.exchange.domain.NextStepChoice;
import com.ember.ember.exchange.domain.NextStepChoice.Choice;
import com.ember.ember.exchange.dto.*;
import com.ember.ember.exchange.event.ExchangeRoomCompletedEvent;
import com.ember.ember.exchange.repository.ExchangeDiaryRepository;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.exchange.repository.NextStepChoiceRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.xss.XssSanitizer;
import com.ember.ember.notification.domain.Notification;
import com.ember.ember.notification.repository.NotificationRepository;
import com.ember.ember.user.domain.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 교환일기 서비스 (도메인 6)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ExchangeRoomRepository exchangeRoomRepository;
    private final ExchangeDiaryRepository exchangeDiaryRepository;
    private final NextStepChoiceRepository nextStepChoiceRepository;
    private final ExchangeReportRepository exchangeReportRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    /** 5.1 교환일기 방 목록 조회 (배치 쿼리로 N+1 방지) */
    @Transactional(readOnly = true)
    public ExchangeRoomListResponse getRooms(Long userId) {
        List<ExchangeRoom> rooms = exchangeRoomRepository.findByParticipant(userId);
        if (rooms.isEmpty()) {
            return ExchangeRoomListResponse.builder().rooms(List.of()).build();
        }

        // 마지막 일기 제출 시각 배치 조회 (N번 SELECT → 1번 GROUP BY)
        List<Long> roomIds = rooms.stream().map(ExchangeRoom::getId).toList();
        Map<Long, LocalDateTime> lastDiaryAtMap = exchangeDiaryRepository
                .findLastSubmittedAtByRoomIds(roomIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (Long) row[0], row -> (LocalDateTime) row[1]));

        List<ExchangeRoomListResponse.ExchangeRoomItem> items = rooms.stream().map(room -> {
            User partner = room.getPartner(userId);
            LocalDateTime lastDiaryAt = lastDiaryAtMap.get(room.getId());

            return ExchangeRoomListResponse.ExchangeRoomItem.builder()
                    .roomId(room.getId())
                    .roomUuid(room.getRoomUuid().toString())
                    .partnerNickname(partner.getNickname())
                    .status(room.getStatus().name())
                    .currentTurn(room.getTurnCount())
                    .isMyTurn(room.getStatus() == RoomStatus.ACTIVE &&
                              room.getCurrentTurnUser().getId().equals(userId))
                    .lastDiaryAt(lastDiaryAt != null ? lastDiaryAt.format(ISO) : null)
                    .deadline(room.getStatus() == RoomStatus.ACTIVE &&
                              room.getCurrentTurnUser().getId().equals(userId)
                              ? room.getDeadlineAt().format(ISO) : null)
                    .build();
        }).toList();

        return ExchangeRoomListResponse.builder().rooms(items).build();
    }

    /** 5.2 교환일기 방 상세 조회 */
    @Transactional(readOnly = true)
    public ExchangeRoomDetailResponse getRoomDetail(Long userId, Long roomId) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        User partner = room.getPartner(userId);
        List<ExchangeDiary> diaries = exchangeDiaryRepository.findSubmittedByRoomId(roomId);

        List<ExchangeRoomDetailResponse.DiaryItem> diaryItems = diaries.stream().map(d ->
                ExchangeRoomDetailResponse.DiaryItem.builder()
                        .diaryId(d.getId())
                        .authorId(d.getAuthor().getId())
                        .content(d.getContent())
                        .reaction(d.getReaction() != null ? d.getReaction().name() : null)
                        .readAt(d.getReadAt() != null ? d.getReadAt().format(ISO) : null)
                        .createdAt(d.getSubmittedAt().format(ISO))
                        .turnNumber(d.getTurnNumber())
                        .build()
        ).toList();

        boolean nextStepRequired = room.getStatus() == RoomStatus.COMPLETED;

        return ExchangeRoomDetailResponse.builder()
                .roomId(room.getId())
                .partner(ExchangeRoomDetailResponse.PartnerInfo.builder()
                        .userId(partner.getId())
                        .nickname(partner.getNickname())
                        .build())
                .status(room.getStatus().name())
                .currentTurn(room.getTurnCount())
                .isMyTurn(room.getStatus() == RoomStatus.ACTIVE &&
                          room.getCurrentTurnUser().getId().equals(userId))
                .diaries(diaryItems)
                .deadline(room.getStatus() == RoomStatus.ACTIVE &&
                          room.getCurrentTurnUser().getId().equals(userId)
                          ? room.getDeadlineAt().format(ISO) : null)
                .roundNumber(room.getRoundCount())
                .nextStepRequired(nextStepRequired)
                .nextStepDeadline(room.getNextStepDeadlineAt() != null
                        ? room.getNextStepDeadlineAt().format(ISO) : null)
                .build();
    }

    /** 5.3 교환일기 개별 열람 */
    @Transactional
    public ExchangeDiaryDetailResponse readDiary(Long userId, Long roomId, Long diaryId) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        ExchangeDiary diary = exchangeDiaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXCHANGE_DIARY_NOT_FOUND));

        // 상대방 일기 열람 시 readAt 기록
        if (!diary.getAuthor().getId().equals(userId)) {
            diary.markRead();
        }

        return ExchangeDiaryDetailResponse.builder()
                .diaryId(diary.getId())
                .content(diary.getContent())
                .authorId(diary.getAuthor().getId())
                .reaction(diary.getReaction() != null ? diary.getReaction().name() : null)
                .readAt(diary.getReadAt() != null ? diary.getReadAt().format(ISO) : null)
                .build();
    }

    /** 5.4 교환일기 작성 (턴 기반, 비관적 락으로 동시성 보호) */
    @Transactional
    public ExchangeDiaryWriteResponse writeDiary(Long userId, Long roomId, ExchangeDiaryRequest request) {
        ExchangeRoom room = exchangeRoomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXCHANGE_ROOM_NOT_FOUND));
        validateParticipant(room, userId);

        // 방 상태 확인
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.EXCHANGE_EXPIRED);
        }

        // 차례 확인
        if (!room.getCurrentTurnUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.EXCHANGE_NOT_YOUR_TURN);
        }

        // 기한 확인
        if (LocalDateTime.now().isAfter(room.getDeadlineAt())) {
            throw new BusinessException(ErrorCode.EXCHANGE_EXPIRED);
        }

        int turnNumber = room.getTurnCount() + 1;
        User author = room.getCurrentTurnUser();

        // 이전 턴 일기 조회 (parentDiary)
        ExchangeDiary parentDiary = null;
        if (turnNumber > 1) {
            parentDiary = exchangeDiaryRepository
                    .findByRoomIdAndTurnNumber(roomId, turnNumber - 1)
                    .orElse(null);
        }

        String sanitizedContent = XssSanitizer.sanitize(request.content());
        ExchangeDiary diary = ExchangeDiary.create(room, author, sanitizedContent, turnNumber, parentDiary);
        exchangeDiaryRepository.save(diary);

        // 턴 진행
        room.advanceTurn();
        boolean isCompleted = room.getStatus() == RoomStatus.COMPLETED;

        // 완주 시 도메인 이벤트 발행
        if (isCompleted) {
            eventPublisher.publishEvent(new ExchangeRoomCompletedEvent(
                    room.getId(), room.getUserA().getId(), room.getUserB().getId()));
            log.info("[ExchangeService] 4턴 완주 → 이벤트 발행 — roomId={}", roomId);
        }

        // 상대방에게 알림
        User partner = room.getPartner(userId);
        String title = isCompleted ? "교환일기가 완료되었어요!" : "새로운 교환일기가 도착했어요!";
        String body = isCompleted
                ? "4턴 교환일기가 모두 완료되었습니다. 관계 확장을 선택해주세요!"
                : author.getNickname() + "님이 교환일기를 작성했어요.";
        Notification notification = Notification.create(partner, "EXCHANGE_DIARY",
                title, body, "/exchange-rooms/" + room.getRoomUuid());
        notificationRepository.save(notification);

        log.info("[ExchangeService] 교환일기 작성 — roomId={}, turnNumber={}, isCompleted={}",
                roomId, turnNumber, isCompleted);

        return ExchangeDiaryWriteResponse.builder()
                .diaryId(diary.getId())
                .nextTurn(isCompleted ? turnNumber : turnNumber + 1)
                .isCompleted(isCompleted)
                .chatUnlocked(false)
                .build();
    }

    /** 5.5 리액션 등록 */
    @Transactional
    public void addReaction(Long userId, Long roomId, Long diaryId, ReactionRequest request) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        ExchangeDiary diary = exchangeDiaryRepository.findById(diaryId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXCHANGE_DIARY_NOT_FOUND));

        // 본인 일기에 리액션 불가
        if (diary.getAuthor().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.EXCHANGE_SELF_REACTION);
        }

        Reaction reaction = Reaction.valueOf(request.reaction());
        diary.setReaction(reaction);

        log.info("[ExchangeService] 리액션 등록 — roomId={}, diaryId={}, reaction={}",
                roomId, diaryId, reaction);
    }

    /** 5.6 공통점 리포트 조회 */
    @Transactional(readOnly = true)
    public ExchangeReportResponse getReport(Long userId, Long roomId) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        if (room.getStatus() != RoomStatus.COMPLETED &&
            room.getStatus() != RoomStatus.CHAT_CONNECTED &&
            room.getStatus() != RoomStatus.ARCHIVED) {
            throw new BusinessException(ErrorCode.EXCHANGE_NOT_COMPLETED);
        }

        Optional<ExchangeReport> reportOpt = exchangeReportRepository.findByRoomId(roomId);
        if (reportOpt.isEmpty()) {
            throw new BusinessException(ErrorCode.EXCHANGE_REPORT_NOT_FOUND);
        }

        ExchangeReport report = reportOpt.get();
        if (report.getStatus() == ExchangeReport.ReportStatus.PROCESSING ||
            report.getStatus() == ExchangeReport.ReportStatus.CONSENT_REQUIRED) {
            throw new BusinessException(ErrorCode.EXCHANGE_REPORT_PROCESSING);
        }

        List<String> keywords = parseJsonArray(report.getCommonKeywords());
        List<String> patterns = parseJsonArray(report.getLifestylePatterns());

        return ExchangeReportResponse.builder()
                .reportId(report.getId())
                .status(report.getStatus().name())
                .commonKeywords(keywords)
                .emotionSimilarity(report.getEmotionSimilarity() != null
                        ? report.getEmotionSimilarity().doubleValue() : null)
                .lifestylePatterns(patterns)
                .writingTempA(report.getWritingTempA() != null
                        ? report.getWritingTempA().toPlainString() : null)
                .writingTempB(report.getWritingTempB() != null
                        ? report.getWritingTempB().toPlainString() : null)
                .aiDescription(report.getAiDescription())
                .generatedAt(report.getGeneratedAt() != null
                        ? report.getGeneratedAt().format(ISO) : null)
                .build();
    }

    /** 5.7 관계 확장 선택 */
    @Transactional
    public NextStepResponse chooseNextStep(Long userId, Long roomId, NextStepRequest request) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        if (room.getStatus() != RoomStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.NEXT_STEP_NOT_COMPLETED);
        }

        Choice choice;
        try {
            choice = Choice.valueOf(request.choice());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }

        int roundNumber = room.getRoundCount();

        // 중복 선택 확인
        if (nextStepChoiceRepository.findByRoomIdAndUserIdAndRoundNumber(
                roomId, userId, roundNumber).isPresent()) {
            throw new BusinessException(ErrorCode.NEXT_STEP_ALREADY_CHOSEN);
        }

        // 선택 저장
        User user = room.getUserA().getId().equals(userId) ? room.getUserA() : room.getUserB();
        NextStepChoice nsc = NextStepChoice.create(room, user, roundNumber, choice);
        nextStepChoiceRepository.save(nsc);

        // 상대방 선택 확인
        Long partnerId = room.getPartner(userId).getId();
        Optional<NextStepChoice> partnerChoice = nextStepChoiceRepository
                .findByRoomIdAndUserIdAndRoundNumber(roomId, partnerId, roundNumber);

        if (partnerChoice.isEmpty()) {
            // 상대방 미선택 → 대기
            return NextStepResponse.builder()
                    .status("WAITING_PARTNER")
                    .roundNumber(roundNumber)
                    .build();
        }

        // 양측 선택 완료 → 결과 처리
        return processNextStepResult(room, choice, partnerChoice.get().getChoice(), roundNumber);
    }

    /** 5.8 관계 확장 선택 상태 조회 */
    @Transactional(readOnly = true)
    public NextStepStatusResponse getNextStepStatus(Long userId, Long roomId) {
        ExchangeRoom room = findRoomOrThrow(roomId);
        validateParticipant(room, userId);

        int roundNumber = room.getRoundCount();
        Optional<NextStepChoice> myChoice = nextStepChoiceRepository
                .findByRoomIdAndUserIdAndRoundNumber(roomId, userId, roundNumber);

        Long partnerId = room.getPartner(userId).getId();
        Optional<NextStepChoice> partnerChoice = nextStepChoiceRepository
                .findByRoomIdAndUserIdAndRoundNumber(roomId, partnerId, roundNumber);

        String status = "WAITING_PARTNER";
        String chatRoomUuid = null;

        if (myChoice.isPresent() && partnerChoice.isPresent()) {
            boolean bothChat = myChoice.get().getChoice() == Choice.CHAT
                    && partnerChoice.get().getChoice() == Choice.CHAT;
            if (bothChat) {
                status = "CHAT_CREATED";
                if (room.getChatRoom() != null) {
                    chatRoomUuid = room.getChatRoom().getRoomUuid().toString();
                }
            } else if (roundNumber == 1) {
                status = "AUTO_EXTENDED";
            } else {
                status = "MATCH_ENDED";
            }
        }

        return NextStepStatusResponse.builder()
                .myChoice(myChoice.map(c -> c.getChoice().name()).orElse(null))
                .partnerChose(partnerChoice.isPresent())
                .roundNumber(roundNumber)
                .status(status)
                .chatRoomUuid(chatRoomUuid)
                .build();
    }

    // ── Private 헬퍼 ──

    private NextStepResponse processNextStepResult(ExchangeRoom room, Choice myChoice,
                                                     Choice partnerChoice, int roundNumber) {
        boolean bothChat = myChoice == Choice.CHAT && partnerChoice == Choice.CHAT;

        if (bothChat) {
            // 양측 CHAT → 채팅방 생성
            ChatRoom chatRoom = ChatRoom.create(room.getUserA(), room.getUserB(), room);
            chatRoomRepository.save(chatRoom);
            room.connectChat(chatRoom);

            log.info("[ExchangeService] 양측 CHAT → 채팅방 생성 — roomId={}, chatRoomUuid={}",
                    room.getId(), chatRoom.getRoomUuid());

            return NextStepResponse.builder()
                    .status("CHAT_CREATED")
                    .roundNumber(roundNumber)
                    .chatRoomUuid(chatRoom.getRoomUuid().toString())
                    .build();
        }

        if (roundNumber == 1) {
            // 1차: 불일치 → 추가 1턴 자동 연장
            room.extendRound();

            log.info("[ExchangeService] 1차 불일치 → 추가 1턴 연장 — roomId={}", room.getId());

            return NextStepResponse.builder()
                    .status("AUTO_EXTENDED")
                    .roundNumber(2)
                    .newExpiresAt(room.getDeadlineAt().format(ISO))
                    .build();
        }

        // 재선택: 불일치 재발생 → 매칭 종료
        room.archive();

        log.info("[ExchangeService] 재선택 불일치 → 매칭 종료 — roomId={}", room.getId());

        return NextStepResponse.builder()
                .status("MATCH_ENDED")
                .roundNumber(roundNumber)
                .build();
    }

    private ExchangeRoom findRoomOrThrow(Long roomId) {
        return exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXCHANGE_ROOM_NOT_FOUND));
    }

    private void validateParticipant(ExchangeRoom room, Long userId) {
        if (!room.isParticipant(userId)) {
            throw new BusinessException(ErrorCode.EXCHANGE_NOT_PARTICIPANT);
        }
    }

    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
