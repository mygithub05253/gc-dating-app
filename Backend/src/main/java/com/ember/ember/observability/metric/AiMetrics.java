package com.ember.ember.observability.metric;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

/**
 * AI 파이프라인 관련 커스텀 Micrometer 메트릭 팩토리.
 *
 * <p>사용 예시:
 * <pre>
 *   // Timer
 *   aiMetrics.diaryAnalyzeTimer("success")
 *       .record(() -> /* 측정 로직 *\/);
 *
 *   // Counter
 *   aiMetrics.mqDlqCounter("diary.analyze.dlq").increment();
 *
 *   // Gauge — 등록 시점에 supplier를 주입하므로 별도 increment 불필요
 *   aiMetrics.outboxRelayLag(() -> outboxService.getOldestPendingAgeSeconds());
 * </pre>
 *
 * <p>메트릭 전체 목록:
 * <ul>
 *   <li>{@code ai.diary.analyze.duration} — 일기 분석 소요 시간 (tag: result=success/fail)</li>
 *   <li>{@code ai.matching.calculate.duration} — 매칭 계산 소요 시간 (tag: cache=hit/miss/stale)</li>
 *   <li>{@code ai.content.scan.duration} — 콘텐츠 스캔 소요 시간 (tag: fallback=true/false)</li>
 *   <li>{@code mq.dlq.count} — MQ DLQ 이동 건수 (tag: queue=큐명)</li>
 *   <li>{@code ai.consent.verification} — AI 동의 확인 건수 (tag: result=granted/revoked/missing)</li>
 *   <li>{@code outbox.relay.lag.seconds} — Outbox 릴레이 지연 시간 (게이지)</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AiMetrics {

    private final MeterRegistry meterRegistry;

    // ── Timer ──────────────────────────────────────────────────────────────────

    /**
     * 일기 분석 소요 시간 Timer.
     * DiaryService.createDiary() 내에서 Outbox 저장 완료까지 측정.
     *
     * @param result 처리 결과 ("success" / "fail")
     * @return 측정 준비된 Timer
     */
    public Timer diaryAnalyzeTimer(String result) {
        return Timer.builder("ai.diary.analyze.duration")
                .description("일기 생성 → Outbox 발행까지의 소요 시간")
                .tag("result", result)
                .register(meterRegistry);
    }

    /**
     * 매칭 계산 소요 시간 Timer.
     * MatchingService.getRecommendations() 전체 플로우 측정.
     *
     * @param cache 캐시 상태 ("hit" / "miss" / "stale")
     * @return 측정 준비된 Timer
     */
    public Timer matchingCalculateTimer(String cache) {
        return Timer.builder("ai.matching.calculate.duration")
                .description("매칭 추천 계산 소요 시간")
                .tag("cache", cache)
                .register(meterRegistry);
    }

    /**
     * 콘텐츠 스캔 소요 시간 Timer.
     * ContentScanService.scan() 측정.
     *
     * @param fallback fallback 발동 여부 ("true" / "false")
     * @return 측정 준비된 Timer
     */
    public Timer contentScanTimer(String fallback) {
        return Timer.builder("ai.content.scan.duration")
                .description("콘텐츠 스캔 소요 시간 (FastAPI 호출 또는 로컬 폴백)")
                .tag("fallback", fallback)
                .register(meterRegistry);
    }

    // ── Counter ────────────────────────────────────────────────────────────────

    /**
     * MQ DLQ 이동 건수 Counter.
     *
     * @param queue DLQ 이동이 발생한 큐 이름
     * @return Counter
     */
    public Counter mqDlqCounter(String queue) {
        return Counter.builder("mq.dlq.count")
                .description("MQ DLQ 이동 건수")
                .tag("queue", queue)
                .register(meterRegistry);
    }

    /**
     * AI 동의 확인 건수 Counter.
     * AiConsentService.hasGrantedConsent() 호출 시 증가.
     *
     * @param result 동의 확인 결과 ("granted" / "revoked" / "missing")
     * @return Counter
     */
    public Counter aiConsentVerificationCounter(String result) {
        return Counter.builder("ai.consent.verification")
                .description("AI 동의 확인 건수")
                .tag("result", result)
                .register(meterRegistry);
    }

    // ── Gauge ──────────────────────────────────────────────────────────────────

    /**
     * Outbox 릴레이 지연 게이지 등록.
     * OutboxRelay 폴링 후 가장 오래된 PENDING 이벤트의 createdAt과 현재의 차이(초)를 측정.
     * supplier를 외부에서 주입해 주기적으로 값을 읽는다.
     *
     * <p>등록 예시:
     * <pre>
     *   aiMetrics.outboxRelayLag(
     *       () -> outboxEventRepository.findOldestPendingAgeSeconds().orElse(0.0)
     *   );
     * </pre>
     *
     * @param supplier 현재 지연 시간(초)을 반환하는 공급자
     * @return 등록된 Gauge
     */
    public Gauge outboxRelayLag(Supplier<Number> supplier) {
        return Gauge.builder("outbox.relay.lag.seconds", supplier,
                        s -> s.get() == null ? 0.0 : s.get().doubleValue())
                .description("Outbox 릴레이 최대 지연 시간 (초) — 가장 오래된 PENDING 이벤트 기준")
                .register(meterRegistry);
    }
}
