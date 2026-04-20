package com.ember.ember.messaging.publisher;

import com.ember.ember.messaging.config.RabbitConfig;
import com.ember.ember.messaging.event.DiaryAnalyzeRequestedEvent;
import com.ember.ember.messaging.event.ExchangeReportRequestedEvent;
import com.ember.ember.messaging.event.LifestyleAnalyzeRequestedEvent;
import com.ember.ember.messaging.event.UserVectorGenerateRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * AI 파이프라인 메시지 발행 컴포넌트.
 * OutboxRelay에서 호출하여 RabbitMQ로 메시지를 전송한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiMessagePublisher {

    private final RabbitTemplate rabbitTemplate;

    /**
     * 일기 분석 요청 메시지를 ai.exchange로 발행.
     * routing key: diary.analyze.v1
     *
     * @param event 발행할 일기 분석 요청 이벤트
     */
    public void publishDiaryAnalyze(DiaryAnalyzeRequestedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitConfig.AI_EXCHANGE,
                RabbitConfig.KEY_DIARY_ANALYZE,
                event,
                message -> {
                    // messageId 헤더 세팅 (소비자 멱등성 체크용)
                    MessageProperties props = message.getMessageProperties();
                    props.setMessageId(event.messageId());
                    if (event.traceparent() != null) {
                        props.setHeader("traceparent", event.traceparent());
                    }
                    return message;
                }
        );
        log.debug("[AiMessagePublisher] 일기 분석 요청 발행 완료 — diaryId={}, messageId={}",
                event.diaryId(), event.messageId());
    }

    /**
     * 교환일기 완주 리포트 분석 요청 메시지를 ai.exchange로 발행.
     * routing key: exchange.report.v1
     *
     * FastAPI AI 서버의 exchange.report.q 큐에서 소비하여
     * KcELECTRA + KoSimCSE 기반 리포트를 생성한다.
     *
     * @param event 발행할 교환일기 리포트 요청 이벤트
     */
    public void publishExchangeReport(ExchangeReportRequestedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitConfig.AI_EXCHANGE,
                RabbitConfig.KEY_EXCHANGE_REPORT,
                event,
                message -> {
                    // messageId 헤더 세팅 (소비자 멱등성 체크용)
                    MessageProperties props = message.getMessageProperties();
                    props.setMessageId(event.messageId());
                    if (event.traceparent() != null) {
                        props.setHeader("traceparent", event.traceparent());
                    }
                    return message;
                }
        );
        log.debug("[AiMessagePublisher] 교환일기 리포트 요청 발행 완료 — reportId={}, roomId={}, messageId={}",
                event.reportId(), event.roomId(), event.messageId());
    }

    /**
     * 라이프스타일 분석 요청 메시지를 ai.exchange로 발행.
     * routing key: lifestyle.analyze.v1
     *
     * FastAPI가 lifestyle.analyze.q에서 소비하여
     * KcELECTRA 기반 라이프스타일 패턴·감정 프로필을 분석한다.
     *
     * @param event 발행할 라이프스타일 분석 요청 이벤트
     */
    public void publishLifestyleAnalyze(LifestyleAnalyzeRequestedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitConfig.AI_EXCHANGE,
                RabbitConfig.KEY_LIFESTYLE,
                event,
                message -> {
                    message.getMessageProperties().setMessageId(event.messageId());
                    if (event.traceparent() != null) {
                        message.getMessageProperties().setHeader("traceparent", event.traceparent());
                    }
                    return message;
                }
        );
        log.debug("[AiMessagePublisher] 라이프스타일 분석 요청 발행 완료 — userId={}, messageId={}",
                event.userId(), event.messageId());
    }

    /**
     * 사용자 임베딩 벡터 생성 요청 메시지를 ai.exchange로 발행.
     * routing key: user.vector.generate.v1
     *
     * FastAPI가 user.vector.generate.q에서 소비하여
     * KoSimCSE 임베딩을 생성 후 ai.result.v1로 결과를 반환한다.
     *
     * @param event 발행할 사용자 벡터 생성 요청 이벤트
     */
    public void publishUserVectorGenerate(UserVectorGenerateRequestedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitConfig.AI_EXCHANGE,
                RabbitConfig.KEY_USER_VECTOR,
                event,
                message -> {
                    message.getMessageProperties().setMessageId(event.messageId());
                    if (event.traceparent() != null) {
                        message.getMessageProperties().setHeader("traceparent", event.traceparent());
                    }
                    return message;
                }
        );
        log.debug("[AiMessagePublisher] 사용자 벡터 생성 요청 발행 완료 — userId={}, source={}, messageId={}",
                event.userId(), event.source(), event.messageId());
    }
}
