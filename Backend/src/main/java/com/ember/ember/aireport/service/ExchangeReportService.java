package com.ember.ember.aireport.service;

import com.ember.ember.aireport.domain.ExchangeReport;
import com.ember.ember.aireport.repository.ExchangeReportRepository;
import com.ember.ember.consent.service.AiConsentService;
import com.ember.ember.exchange.domain.ExchangeDiary;
import com.ember.ember.exchange.domain.ExchangeDiary.ExchangeDiaryStatus;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.event.ExchangeRoomCompletedEvent;
import com.ember.ember.exchange.repository.ExchangeDiaryRepository;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
// 결정 4: ConsentType Enum 제거 — String 기반 사용
import com.ember.ember.messaging.event.ExchangeReportRequestedEvent;
import com.ember.ember.messaging.event.ExchangeReportRequestedEvent.DiaryPayload;
import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * 교환일기 완주 리포트 생성 서비스
 *
 * 처리 흐름:
 *   1. ExchangeRoomCompletedEvent 수신 (AFTER_COMMIT)
 *   2. 중복 방지: roomId 기준 리포트 이미 존재하면 종료
 *   3. 2-party 동의 검증 (AI_DATA_USAGE)
 *      - 한쪽이라도 미동의 → CONSENT_REQUIRED 상태 리포트 저장 + TODO 푸시 알림
 *      - 양측 동의 → PROCESSING 상태 리포트 저장 + Outbox(EXCHANGE_REPORT_REQUESTED) 생성
 *
 * NOTE: 완주 이벤트 publish 훅 연결 지점 (TODO)
 *   ExchangeRoom 상태를 COMPLETED로 전이하는 Service/메서드가 확정된 후,
 *   해당 시점에 ApplicationEventPublisher.publishEvent(new ExchangeRoomCompletedEvent(...)) 추가 필요.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeReportService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter ISO_KST = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final ExchangeReportRepository exchangeReportRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final ExchangeDiaryRepository exchangeDiaryRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final AiConsentService aiConsentService;
    private final ObjectMapper objectMapper;

    /**
     * 교환일기 방 완주 이벤트 처리.
     *
     * @TransactionalEventListener(phase=AFTER_COMMIT) 사용 이유:
     *   ExchangeRoom 상태 변경 트랜잭션이 DB에 커밋된 후에 리포트 생성 로직을 실행하여
     *   room 상태 롤백 시 리포트 생성이 발생하지 않도록 안전성 확보.
     *
     * @param event 교환방 완주 도메인 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void onExchangeRoomCompleted(ExchangeRoomCompletedEvent event) {
        Long roomId = event.roomId();
        Long userAId = event.userAId();
        Long userBId = event.userBId();

        log.info("[ExchangeReportService] 완주 이벤트 수신 — roomId={}, userAId={}, userBId={}",
                roomId, userAId, userBId);

        // 1. 중복 생성 방지: 이미 리포트가 존재하면 종료
        if (exchangeReportRepository.existsByRoomId(roomId)) {
            log.info("[ExchangeReportService] 리포트 이미 존재 — 생성 생략 roomId={}", roomId);
            return;
        }

        // ExchangeRoom 조회 (ExchangeReport 연관관계 저장용)
        ExchangeRoom room = exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> {
                    log.error("[ExchangeReportService] ExchangeRoom 없음 — roomId={}", roomId);
                    return new IllegalStateException("ExchangeRoom 없음: roomId=" + roomId);
                });

        // 2. 2-party 동의 검증 (AI_DATA_USAGE)
        boolean consentA = aiConsentService.hasGrantedConsent(userAId, "AI_DATA_USAGE");
        boolean consentB = aiConsentService.hasGrantedConsent(userBId, "AI_DATA_USAGE");

        if (!consentA || !consentB) {
            // 미동의 처리: CONSENT_REQUIRED 상태로 저장
            ExchangeReport consentRequiredReport = ExchangeReport.ofConsentRequired(room);
            exchangeReportRepository.save(consentRequiredReport);

            log.info("[ExchangeReportService] 2-party 동의 미획득 — CONSENT_REQUIRED 저장 " +
                     "roomId={}, consentA={}, consentB={}", roomId, consentA, consentB);

            // TODO(M7): 동의 요청 FCM 푸시 알림 발송
            //   - 미동의 사용자(userAId 또는 userBId)에게 AI 동의 요청 알림 발송
            //   - 동의 완료 시 CONSENT_REQUIRED → PROCESSING 재트리거 로직 추가 필요
            return;
        }

        // 3. 양측 동의 → PROCESSING 상태 리포트 생성
        ExchangeReport report = ExchangeReport.ofProcessing(room);
        ExchangeReport savedReport = exchangeReportRepository.save(report);

        // 4. 교환일기 조회 (SUBMITTED 상태만)
        List<ExchangeDiary> diariesA = exchangeDiaryRepository.findByRoomIdAndAuthorIdAndStatus(
                roomId, userAId, ExchangeDiaryStatus.SUBMITTED);
        List<ExchangeDiary> diariesB = exchangeDiaryRepository.findByRoomIdAndAuthorIdAndStatus(
                roomId, userBId, ExchangeDiaryStatus.SUBMITTED);

        // 5. Outbox 이벤트 생성 (EXCHANGE_REPORT_REQUESTED)
        String publishedAt = LocalDateTime.now(KST)
                .atZone(KST)
                .format(ISO_KST);

        ExchangeReportRequestedEvent requestedEvent = new ExchangeReportRequestedEvent(
                UUID.randomUUID().toString(),
                ExchangeReportRequestedEvent.VERSION,
                savedReport.getId(),
                roomId,
                userAId,
                userBId,
                toDiaryPayloads(diariesA),
                toDiaryPayloads(diariesB),
                publishedAt,
                null  // traceparent: OpenTelemetry 연동 후 주입
        );

        try {
            String payload = objectMapper.writeValueAsString(requestedEvent);
            OutboxEvent outboxEvent = OutboxEvent.of(
                    "EXCHANGE_REPORT",
                    savedReport.getId(),
                    "EXCHANGE_REPORT_REQUESTED",
                    payload
            );
            outboxEventRepository.save(outboxEvent);

            log.info("[ExchangeReportService] Outbox 이벤트 저장 완료 — reportId={}, roomId={}, " +
                     "diariesA={}건, diariesB={}건",
                     savedReport.getId(), roomId, diariesA.size(), diariesB.size());

        } catch (JsonProcessingException e) {
            log.error("[ExchangeReportService] Outbox 페이로드 직렬화 실패 — reportId={}, roomId={}",
                      savedReport.getId(), roomId, e);
            // 직렬화 실패 시 리포트를 FAILED로 전환 후 예외 전파
            savedReport.failReport();
            exchangeReportRepository.save(savedReport);
            throw new RuntimeException("ExchangeReport Outbox 직렬화 실패", e);
        }
    }

    // -------------------------------------------------------------------------
    // private 헬퍼
    // -------------------------------------------------------------------------

    /**
     * ExchangeDiary 목록을 메시지 페이로드용 DiaryPayload 목록으로 변환.
     */
    private List<DiaryPayload> toDiaryPayloads(List<ExchangeDiary> diaries) {
        return diaries.stream()
                .map(d -> new DiaryPayload(d.getId(), d.getContent()))
                .toList();
    }
}
