package com.ember.ember.messaging.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ 토폴로지 설정
 *
 * Exchange:
 *   - ai.exchange   : AI 파이프라인 메인 Exchange (TopicExchange)
 *   - ai.dlx        : Dead Letter Exchange (TopicExchange)
 *
 * Queue:
 *   - diary.analyze.q       → routing key: diary.analyze.v1
 *   - exchange.report.q     → routing key: exchange.report.v1
 *   - lifestyle.analyze.q   → routing key: lifestyle.analyze.v1
 *   - ai.result.q           → routing key: ai.result.v1
 *   - DLQ: diary.analyze.dlq / exchange.report.dlq / ai.result.dlq
 *
 * TODO(M2): 지수 백오프용 TTL 재시도 큐 추가
 *   diary.analyze.retry.1s.q  (x-message-ttl=1000,  x-dead-letter-exchange=ai.exchange, x-dead-letter-routing-key=diary.analyze.v1)
 *   diary.analyze.retry.4s.q  (x-message-ttl=4000)
 *   diary.analyze.retry.16s.q (x-message-ttl=16000)
 *   → Delayed Message Plugin 없이 TTL 기반 재시도 구조. M1에서는 기본 DLQ만 선언.
 */
@Configuration
public class RabbitConfig {

    // -------------------------------------------------------------------------
    // Exchange 이름 상수
    // -------------------------------------------------------------------------
    public static final String AI_EXCHANGE     = "ai.exchange";
    public static final String AI_DLX         = "ai.dlx";

    // -------------------------------------------------------------------------
    // 라우팅 키 상수
    // -------------------------------------------------------------------------
    public static final String KEY_DIARY_ANALYZE      = "diary.analyze.v1";
    public static final String KEY_EXCHANGE_REPORT    = "exchange.report.v1";
    public static final String KEY_LIFESTYLE          = "lifestyle.analyze.v1";
    public static final String KEY_USER_VECTOR        = "user.vector.generate.v1";   // M6
    public static final String KEY_AI_RESULT          = "ai.result.v1";

    // -------------------------------------------------------------------------
    // 큐 이름 상수
    // -------------------------------------------------------------------------
    public static final String Q_DIARY_ANALYZE    = "diary.analyze.q";
    public static final String Q_EXCHANGE_REPORT  = "exchange.report.q";
    public static final String Q_LIFESTYLE        = "lifestyle.analyze.q";
    public static final String Q_USER_VECTOR      = "user.vector.generate.q";       // M6
    public static final String Q_AI_RESULT        = "ai.result.q";

    public static final String Q_DIARY_DLQ        = "diary.analyze.dlq";
    public static final String Q_EXCHANGE_DLQ     = "exchange.report.dlq";
    public static final String Q_USER_VECTOR_DLQ  = "user.vector.generate.dlq";    // M6
    public static final String Q_AI_RESULT_DLQ    = "ai.result.dlq";

    // -------------------------------------------------------------------------
    // Exchange 선언
    // -------------------------------------------------------------------------

    @Bean
    public TopicExchange aiExchange() {
        return ExchangeBuilder.topicExchange(AI_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public TopicExchange aiDlx() {
        return ExchangeBuilder.topicExchange(AI_DLX)
                .durable(true)
                .build();
    }

    // -------------------------------------------------------------------------
    // 메인 큐 선언 (DLX 연결)
    // -------------------------------------------------------------------------

    @Bean
    public Queue diaryAnalyzeQueue() {
        return QueueBuilder.durable(Q_DIARY_ANALYZE)
                .withArgument("x-dead-letter-exchange", AI_DLX)
                .withArgument("x-dead-letter-routing-key", Q_DIARY_DLQ)
                .build();
    }

    @Bean
    public Queue exchangeReportQueue() {
        return QueueBuilder.durable(Q_EXCHANGE_REPORT)
                .withArgument("x-dead-letter-exchange", AI_DLX)
                .withArgument("x-dead-letter-routing-key", Q_EXCHANGE_DLQ)
                .build();
    }

    @Bean
    public Queue lifestyleAnalyzeQueue() {
        return QueueBuilder.durable(Q_LIFESTYLE)
                .withArgument("x-dead-letter-exchange", AI_DLX)
                .withArgument("x-dead-letter-routing-key", Q_DIARY_DLQ) // 라이프스타일 DLQ는 일기 DLQ 공유 (M1)
                .build();
    }

    /** 사용자 임베딩 벡터 생성 큐 (M6 신규) */
    @Bean
    public Queue userVectorGenerateQueue() {
        return QueueBuilder.durable(Q_USER_VECTOR)
                .withArgument("x-dead-letter-exchange", AI_DLX)
                .withArgument("x-dead-letter-routing-key", Q_USER_VECTOR_DLQ)
                .build();
    }

    @Bean
    public Queue aiResultQueue() {
        return QueueBuilder.durable(Q_AI_RESULT)
                .withArgument("x-dead-letter-exchange", AI_DLX)
                .withArgument("x-dead-letter-routing-key", Q_AI_RESULT_DLQ)
                .build();
    }

    // -------------------------------------------------------------------------
    // DLQ 선언
    // -------------------------------------------------------------------------

    @Bean
    public Queue diaryAnalyzeDlq() {
        return QueueBuilder.durable(Q_DIARY_DLQ).build();
    }

    @Bean
    public Queue exchangeReportDlq() {
        return QueueBuilder.durable(Q_EXCHANGE_DLQ).build();
    }

    /** 사용자 벡터 생성 DLQ (M6 신규) */
    @Bean
    public Queue userVectorGenerateDlq() {
        return QueueBuilder.durable(Q_USER_VECTOR_DLQ).build();
    }

    @Bean
    public Queue aiResultDlq() {
        return QueueBuilder.durable(Q_AI_RESULT_DLQ).build();
    }

    // -------------------------------------------------------------------------
    // 바인딩
    // -------------------------------------------------------------------------

    @Bean
    public Binding diaryAnalyzeBinding(Queue diaryAnalyzeQueue, TopicExchange aiExchange) {
        return BindingBuilder.bind(diaryAnalyzeQueue).to(aiExchange).with(KEY_DIARY_ANALYZE);
    }

    @Bean
    public Binding exchangeReportBinding(Queue exchangeReportQueue, TopicExchange aiExchange) {
        return BindingBuilder.bind(exchangeReportQueue).to(aiExchange).with(KEY_EXCHANGE_REPORT);
    }

    @Bean
    public Binding lifestyleAnalyzeBinding(Queue lifestyleAnalyzeQueue, TopicExchange aiExchange) {
        return BindingBuilder.bind(lifestyleAnalyzeQueue).to(aiExchange).with(KEY_LIFESTYLE);
    }

    /** 사용자 벡터 생성 큐 바인딩 (M6 신규) */
    @Bean
    public Binding userVectorGenerateBinding(Queue userVectorGenerateQueue, TopicExchange aiExchange) {
        return BindingBuilder.bind(userVectorGenerateQueue).to(aiExchange).with(KEY_USER_VECTOR);
    }

    @Bean
    public Binding aiResultBinding(Queue aiResultQueue, TopicExchange aiExchange) {
        return BindingBuilder.bind(aiResultQueue).to(aiExchange).with(KEY_AI_RESULT);
    }

    // -------------------------------------------------------------------------
    // 메시지 컨버터 / RabbitTemplate
    // -------------------------------------------------------------------------

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(converter);
        return template;
    }

    // -------------------------------------------------------------------------
    // Listener Container Factory: prefetch=4, concurrency=2
    // -------------------------------------------------------------------------

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter converter) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(converter);
        factory.setPrefetchCount(4);          // 한 Consumer당 최대 4개 미확인 메시지
        factory.setConcurrentConsumers(2);    // 최소 2 스레드
        factory.setMaxConcurrentConsumers(4); // 부하 시 최대 4 스레드로 확장
        // 처리 실패 메시지는 DLQ로 이동 (재큐 금지)
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
