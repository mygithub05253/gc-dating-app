package com.ember.ember.messaging.consumer;

import com.ember.ember.aireport.service.ExchangeReportResultHandler;
import com.ember.ember.aireport.service.LifestyleAnalysisResultHandler;
import com.ember.ember.aireport.service.UserVectorResultHandler;
import com.ember.ember.diary.service.DiaryAnalysisResultHandler;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.idempotency.entity.ProcessedMessage;
import com.ember.ember.messaging.idempotency.repository.ProcessedMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * AI 분석 결과 메시지 소비자.
 * ai.result.q 큐에서 AiAnalysisResultEvent를 수신하여 처리.
 *
 * 멱등성 보장 전략:
 *   - ProcessedMessage에 messageId를 INSERT 시도.
 *   - PK 중복(DataIntegrityViolationException) 발생 시 중복 메시지로 판단 → ACK만 하고 종료.
 *
 * 실패 정책:
 *   - RuntimeException 발생 시 메시지 재큐 없이 DLQ(ai.result.dlq)로 이동.
 *   - ContainerFactory에서 setDefaultRequeueRejected(false) 설정됨.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiResultConsumer {

    private static final String CONSUMER_NAME = "ai-result-consumer";

    private final ProcessedMessageRepository processedMessageRepository;
    private final DiaryAnalysisResultHandler diaryAnalysisResultHandler;
    private final ExchangeReportResultHandler exchangeReportResultHandler;
    private final LifestyleAnalysisResultHandler lifestyleAnalysisResultHandler;
    private final UserVectorResultHandler userVectorResultHandler;

    /**
     * ai.result.q 메시지 수신 및 처리.
     *
     * @param event 수신된 AI 분석 결과 이벤트
     */
    @RabbitListener(queues = "ai.result.q", containerFactory = "rabbitListenerContainerFactory")
    public void consume(AiAnalysisResultEvent event) {
        String messageId = event.messageId();
        log.debug("[AiResultConsumer] 메시지 수신 — messageId={}, type={}, diaryId={}, reportId={}",
                messageId, event.type(), event.diaryId(), event.reportId());

        // 멱등성 체크: 이미 처리된 messageId면 ACK 후 종료
        if (isAlreadyProcessed(messageId)) {
            log.info("[AiResultConsumer] 중복 메시지 감지 — messageId={}, 처리 생략", messageId);
            return;
        }

        // 타입별 분기 처리
        switch (event.type()) {
            case DIARY_ANALYSIS_COMPLETED       -> diaryAnalysisResultHandler.handleCompleted(event);
            case DIARY_ANALYSIS_FAILED          -> diaryAnalysisResultHandler.handleFailed(event);
            case EXCHANGE_REPORT_COMPLETED      -> exchangeReportResultHandler.handleCompleted(event);
            case EXCHANGE_REPORT_FAILED         -> exchangeReportResultHandler.handleFailed(event);
            case LIFESTYLE_ANALYSIS_COMPLETED   -> lifestyleAnalysisResultHandler.handleCompleted(event);
            case LIFESTYLE_ANALYSIS_FAILED      -> lifestyleAnalysisResultHandler.handleFailed(event);
            case USER_VECTOR_GENERATED          -> userVectorResultHandler.handleGenerated(event);
            case USER_VECTOR_FAILED             -> userVectorResultHandler.handleFailed(event);
            default -> log.warn("[AiResultConsumer] 알 수 없는 결과 타입 — type={}", event.type());
        }

        // 처리 완료 기록 (다음 중복 메시지 차단용)
        saveProcessedMessage(messageId);

        log.debug("[AiResultConsumer] 처리 완료 — messageId={}", messageId);
    }

    /**
     * 이미 처리된 메시지인지 확인.
     * ProcessedMessageRepository.existsById() 사용.
     */
    private boolean isAlreadyProcessed(String messageId) {
        return processedMessageRepository.existsById(messageId);
    }

    /**
     * 처리 완료 기록 저장.
     * DataIntegrityViolationException 발생 시 이미 다른 인스턴스에서 처리된 것으로 판단 — 무시.
     */
    private void saveProcessedMessage(String messageId) {
        try {
            processedMessageRepository.save(ProcessedMessage.of(messageId, CONSUMER_NAME));
        } catch (DataIntegrityViolationException e) {
            // 레이스 컨디션으로 인한 중복 저장 시도 — 무시
            log.debug("[AiResultConsumer] ProcessedMessage 중복 저장 시도 무시 — messageId={}", messageId);
        }
    }
}
