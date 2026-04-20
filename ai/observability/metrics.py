"""
Ember AI 서버 커스텀 Prometheus 메트릭 정의 (M7 관측성)

메트릭 전체 목록:
  - ai_diary_analyze_duration_seconds  : 일기 분석 소요 시간 (result=success/fail)
  - ai_matching_calculate_duration_seconds : 매칭 계산 소요 시간 (cache=hit/miss)
  - ai_content_scan_duration_seconds   : 콘텐츠 스캔 소요 시간 (fallback=true/false)
  - ai_mq_dlq_total                    : MQ DLQ 이동 건수 (queue=큐명)

사용 예시:
  # 일기 분석 성공 시
  with DIARY_ANALYZE_DURATION.labels(result="success").time():
      result = await analyze_diary(content)

  # DLQ 이동 시
  MQ_DLQ_COUNT.labels(queue="diary.analyze.q.dlq").inc()
"""

from prometheus_client import Counter, Histogram

# ── Histogram (소요 시간 측정) ──────────────────────────────────────────────────

DIARY_ANALYZE_DURATION = Histogram(
    name="ai_diary_analyze_duration_seconds",
    documentation="일기 분석 소요 시간 (KcELECTRA 추론 포함)",
    labelnames=["result"],
    # buckets: 0.5초~30초 — KcELECTRA 추론 특성상 장시간 분포 커버
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0),
)

MATCHING_CALCULATE_DURATION = Histogram(
    name="ai_matching_calculate_duration_seconds",
    documentation="매칭 계산 소요 시간 (KoSimCSE 코사인 유사도 계산 포함)",
    labelnames=["cache"],
    # buckets: 캐시 히트(~0.1s)와 미스(~5s) 양쪽 커버
    buckets=(0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0),
)

CONTENT_SCAN_DURATION = Histogram(
    name="ai_content_scan_duration_seconds",
    documentation="콘텐츠 스캔 소요 시간 (FastAPI 내부 처리 시간)",
    labelnames=["fallback"],
    # buckets: 빠른 정규식 검사(~0.01s)부터 모델 추론(~2s)까지 커버
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
)

# ── Counter (이벤트 발생 횟수) ────────────────────────────────────────────────────

MQ_DLQ_COUNT = Counter(
    name="ai_mq_dlq_total",
    documentation="MQ DLQ 이동 건수 — 파싱 실패 또는 추론 예외로 인한 dead-letter",
    labelnames=["queue"],
)
