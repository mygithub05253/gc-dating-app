"""
RabbitMQ Consumer (aio-pika 기반)

구독 큐 (총 4개):
  - diary.analyze.q           : 일기 단건 분석 (M2, prefetch=MQ_PREFETCH_COUNT)
  - exchange.report.q         : 교환일기 완주 리포트 분석 (M5, prefetch=1)
  - lifestyle.analyze.q       : 라이프스타일 분석 (M6, prefetch=1 — KcELECTRA×N 무거움)
  - user.vector.generate.q    : 사용자 임베딩 벡터 생성 (M6, prefetch=4 — KoSimCSE 단건 가벼움)

처리 흐름 (공통):
  1. JSON 파싱 실패       → reject(requeue=False)  : DLQ 이동
  2. 입력 검증 실패       → FAILED 이벤트 발행 + ack : 재시도 불필요 에러
  3. 추론 타임아웃        → FAILED(INFERENCE_TIMEOUT) 이벤트 발행 + ack
  4. 추론 실패(기타 예외) → nack(requeue=False)    : DLQ 이동
  5. 정상 완료            → COMPLETED 이벤트 발행 + ack

타임아웃:
  - diary.analyze.q           : 타임아웃 없음 (단건, 빠름)
  - exchange.report.q         : 60초 (KcELECTRA×2 + KoSimCSE 병렬)
  - lifestyle.analyze.q       : 60초 (KcELECTRA×N 병렬 추론)
  - user.vector.generate.q    : 10초 (KoSimCSE 단건)
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

import aio_pika
import structlog
import structlog.contextvars
from aio_pika.abc import AbstractIncomingMessage, AbstractRobustConnection
from observability.metrics import (
  DIARY_ANALYZE_DURATION,
  MQ_DLQ_COUNT,
)

from config import (
  DIARY_ANALYZE_QUEUE,
  EXCHANGE_REPORT_QUEUE,
  LIFESTYLE_ANALYZE_QUEUE,
  MQ_PREFETCH_COUNT,
  RABBITMQ_URL,
  USER_VECTOR_GENERATE_QUEUE,
)
from schemas.messages import (
  AiAnalysisResult,
  AnalysisError,
  DiaryAnalyzeRequest,
  ExchangeReportRequest,
  LifestyleAnalyzeRequest,
  UserVectorGenerateRequest,
)
from services import kcelectra_service
from services.exchange_report_service import build_exchange_report
from services.lifestyle_service import build_lifestyle_report
from services.user_vector_service import generate_user_vector
from workers.mq_publisher import MqPublisher

logger = structlog.get_logger(__name__)

# KST = UTC+9
_KST = timezone(timedelta(hours=9))

# 교환일기 리포트 추론 타임아웃 (초)
_EXCHANGE_REPORT_TIMEOUT_SECONDS: int = 60

# 라이프스타일 분석 추론 타임아웃 (초) — KcELECTRA×N 병렬 추론
_LIFESTYLE_TIMEOUT_SECONDS: int = 60

# 사용자 벡터 생성 추론 타임아웃 (초) — KoSimCSE 단건
_USER_VECTOR_TIMEOUT_SECONDS: int = 10

# user.vector.generate.q prefetch 수 — 단건 추론으로 CPU 경합 낮아 병렬 허용
_USER_VECTOR_PREFETCH: int = 4


def _now_kst_iso() -> str:
  """현재 시각을 KST ISO-8601 문자열로 반환."""
  return datetime.now(_KST).isoformat()


class MqConsumer:
  """
  총 4개 큐를 병렬 구독하는 비동기 Consumer.

  각 큐는 독립된 RabbitMQ 커넥션을 가지며, asyncio.gather로 동시 구독한다.
  독립 커넥션 이유: 큐별 prefetch 설정이 다르므로 채널 공유 시 충돌 발생.

  구독 큐:
    - diary.analyze.q        (M2)
    - exchange.report.q      (M5)
    - lifestyle.analyze.q    (M6, 신규)
    - user.vector.generate.q (M6, 신규)
  """

  def __init__(self) -> None:
    # 각 큐별 커넥션 독립 관리 (prefetch 설정 충돌 방지)
    self._diary_connection: AbstractRobustConnection | None = None
    self._report_connection: AbstractRobustConnection | None = None
    self._lifestyle_connection: AbstractRobustConnection | None = None
    self._user_vector_connection: AbstractRobustConnection | None = None
    self._running: bool = False

  async def start(self, publisher: MqPublisher) -> None:
    """
    4개 큐를 asyncio.gather로 병렬 구독 시작.
    aio-pika connect_robust로 자동 재연결 처리.
    """
    self._running = True
    await asyncio.gather(
      self._subscribe_diary_analyze(publisher),
      self._subscribe_exchange_report(publisher),
      self._subscribe_lifestyle_analyze(publisher),
      self._subscribe_user_vector_generate(publisher),
    )

  # ── diary.analyze.q ──────────────────────────────────────────────────────────

  async def _subscribe_diary_analyze(self, publisher: MqPublisher) -> None:
    """diary.analyze.q 구독 루프."""
    self._diary_connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with self._diary_connection:
      channel = await self._diary_connection.channel()
      # CPU 추론 기준 동시 처리 안전값 (환경 변수로 오버라이드 가능)
      await channel.set_qos(prefetch_count=MQ_PREFETCH_COUNT)

      # diary.analyze.q 는 Spring M1 에서 이미 선언됨
      queue = await channel.get_queue(DIARY_ANALYZE_QUEUE)
      logger.info("MqConsumer 구독 시작", queue=DIARY_ANALYZE_QUEUE)

      async with queue.iterator() as queue_iter:
        async for message in queue_iter:
          if not self._running:
            break
          await self._handle_diary_analyze(message, publisher)

  async def _handle_diary_analyze(
    self,
    message: AbstractIncomingMessage,
    publisher: MqPublisher,
  ) -> None:
    """diary.analyze 메시지 1건 처리."""
    log = logger.bind(delivery_tag=message.delivery_tag)

    # ── 1. JSON 파싱 ──────────────────────────────────────────────────────
    try:
      raw = json.loads(message.body.decode("utf-8"))
      request = DiaryAnalyzeRequest.model_validate(raw)
    except Exception as parse_err:
      log.error("메시지 파싱 실패 — DLQ 이동", error=str(parse_err))
      # DLQ 이동 카운터 증가
      MQ_DLQ_COUNT.labels(queue=DIARY_ANALYZE_QUEUE).inc()
      await message.reject(requeue=False)
      return

    # traceparent를 structlog contextvars에 바인딩 — 이후 모든 로그에 자동 포함
    if request.traceparent:
      structlog.contextvars.bind_contextvars(traceparent=request.traceparent)

    log = log.bind(
      messageId=request.messageId,
      diaryId=request.diaryId,
      userId=request.userId,
      traceparent=request.traceparent,
    )
    log.info("diary.analyze 메시지 수신")

    # ── 2~3. KcELECTRA 추론 (DIARY_ANALYZE_DURATION 측정) ─────────────────
    try:
      with DIARY_ANALYZE_DURATION.labels(result="success").time():
        analysis_result = await kcelectra_service.analyze_diary(request.content)

      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="DIARY_ANALYSIS_COMPLETED",
        diaryId=request.diaryId,
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        result=analysis_result,
      )
      await publisher.publish_ai_result(outbound)
      log.info("DIARY_ANALYSIS_COMPLETED 발행 완료")

    except ValueError as val_err:
      # 길이 부족 등 재시도 불필요 에러 — FAILED 이벤트 발행 후 ack
      DIARY_ANALYZE_DURATION.labels(result="fail").observe(0)  # 추론 도달 전 실패 기록
      log.warning("분석 불가 에러 (재시도 불가)", error=str(val_err))
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="DIARY_ANALYSIS_FAILED",
        diaryId=request.diaryId,
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="CONTENT_TOO_SHORT",
          detail=str(val_err),
        ),
      )
      await publisher.publish_ai_result(outbound)
      log.info("DIARY_ANALYSIS_FAILED 발행 완료 (재시도 불가 에러)")
      await message.ack()
      return

    except Exception as exc:
      log.error("추론 중 예외 발생 — DLQ 이동", error=str(exc), exc_info=True)
      MQ_DLQ_COUNT.labels(queue=DIARY_ANALYZE_QUEUE).inc()
      await message.nack(requeue=False)
      return

    finally:
      # 메시지 처리 완료 후 contextvars 정리
      structlog.contextvars.clear_contextvars()

    await message.ack()

  # ── exchange.report.q (M5) ────────────────────────────────────────────────

  async def _subscribe_exchange_report(self, publisher: MqPublisher) -> None:
    """exchange.report.q 구독 루프 (prefetch=1 — 무거운 추론)."""
    self._report_connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with self._report_connection:
      channel = await self._report_connection.channel()
      # 교환일기 리포트는 KcELECTRA×2 + KoSimCSE 동시 추론 → prefetch=1 고정
      await channel.set_qos(prefetch_count=1)

      # exchange.report.q 는 Spring M5 에서 이미 선언됨
      queue = await channel.get_queue(EXCHANGE_REPORT_QUEUE)
      logger.info("MqConsumer 구독 시작", queue=EXCHANGE_REPORT_QUEUE)

      async with queue.iterator() as queue_iter:
        async for message in queue_iter:
          if not self._running:
            break
          await self._handle_exchange_report(message, publisher)

  async def _handle_exchange_report(
    self,
    message: AbstractIncomingMessage,
    publisher: MqPublisher,
  ) -> None:
    """
    exchange.report 메시지 1건 처리.

    에러 분기:
      - 파싱 실패                → reject(requeue=False) / DLQ
      - 빈 일기 목록 등 ValueError → FAILED 이벤트 발행 + ack
      - asyncio.TimeoutError     → FAILED(INFERENCE_TIMEOUT) 발행 + ack
      - 기타 추론 예외            → nack(requeue=False) / DLQ
    """
    log = logger.bind(delivery_tag=message.delivery_tag)

    # ── 1. JSON 파싱 ──────────────────────────────────────────────────────
    try:
      raw = json.loads(message.body.decode("utf-8"))
      request = ExchangeReportRequest.model_validate(raw)
    except Exception as parse_err:
      log.error("exchange.report 파싱 실패 — DLQ 이동", error=str(parse_err))
      MQ_DLQ_COUNT.labels(queue=EXCHANGE_REPORT_QUEUE).inc()
      await message.reject(requeue=False)
      return

    # traceparent를 structlog contextvars에 바인딩
    if request.traceparent:
      structlog.contextvars.bind_contextvars(traceparent=request.traceparent)

    log = log.bind(
      messageId=request.messageId,
      reportId=request.reportId,
      roomId=request.roomId,
      traceparent=request.traceparent,
    )
    log.info("exchange.report 메시지 수신")

    # ── 2~3. 분석 (60초 타임아웃 적용) ────────────────────────────────────
    try:
      exchange_result = await asyncio.wait_for(
        build_exchange_report(request),
        timeout=_EXCHANGE_REPORT_TIMEOUT_SECONDS,
      )

      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="EXCHANGE_REPORT_COMPLETED",
        reportId=request.reportId,
        roomId=request.roomId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        exchangeResult=exchange_result,
      )
      await publisher.publish_ai_result(outbound)
      log.info("EXCHANGE_REPORT_COMPLETED 발행 완료")

    except ValueError as val_err:
      # 빈 일기 목록 / 글자 수 미달 등 재시도 불필요 에러
      log.warning("리포트 생성 불가 에러 (재시도 불가)", error=str(val_err))
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="EXCHANGE_REPORT_FAILED",
        reportId=request.reportId,
        roomId=request.roomId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INVALID_INPUT",
          detail=str(val_err),
        ),
      )
      await publisher.publish_ai_result(outbound)
      log.info("EXCHANGE_REPORT_FAILED 발행 완료 (입력 오류)")
      await message.ack()
      return

    except asyncio.TimeoutError:
      # 60초 초과 — 일시적 부하 가능성. ack 처리해 무한 재시도 방지
      log.error(
        "교환일기 리포트 추론 타임아웃",
        timeout_seconds=_EXCHANGE_REPORT_TIMEOUT_SECONDS,
      )
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="EXCHANGE_REPORT_FAILED",
        reportId=request.reportId,
        roomId=request.roomId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INFERENCE_TIMEOUT",
          detail=f"{_EXCHANGE_REPORT_TIMEOUT_SECONDS}초 내 추론이 완료되지 않았습니다.",
        ),
      )
      await publisher.publish_ai_result(outbound)
      await message.ack()
      return

    except Exception as exc:
      # 모델 오류 / 예상치 못한 예외 → DLQ
      log.error("리포트 추론 중 예외 발생 — DLQ 이동", error=str(exc), exc_info=True)
      MQ_DLQ_COUNT.labels(queue=EXCHANGE_REPORT_QUEUE).inc()
      await message.nack(requeue=False)
      return

    finally:
      structlog.contextvars.clear_contextvars()

    # ── 4. 정상 처리 완료 ── ack ────────────────────────────────────────────
    await message.ack()

  # ── lifestyle.analyze.q (M6 신규) ────────────────────────────────────────────

  async def _subscribe_lifestyle_analyze(self, publisher: MqPublisher) -> None:
    """
    lifestyle.analyze.q 구독 루프.

    prefetch=1 이유: KcELECTRA×N 병렬 추론으로 CPU/메모리 부하가 높아
    동시 처리 메시지를 1개로 제한하여 OOM 및 추론 지연을 방지한다.
    """
    self._lifestyle_connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with self._lifestyle_connection:
      channel = await self._lifestyle_connection.channel()
      # 무거운 병렬 추론 → prefetch=1 고정
      await channel.set_qos(prefetch_count=1)

      # lifestyle.analyze.q 는 Spring M6 에서 선언됨
      queue = await channel.get_queue(LIFESTYLE_ANALYZE_QUEUE)
      logger.info("MqConsumer 구독 시작", queue=LIFESTYLE_ANALYZE_QUEUE)

      async with queue.iterator() as queue_iter:
        async for message in queue_iter:
          if not self._running:
            break
          await self._handle_lifestyle_analyze(message, publisher)

  async def _handle_lifestyle_analyze(
    self,
    message: AbstractIncomingMessage,
    publisher: MqPublisher,
  ) -> None:
    """
    lifestyle.analyze 메시지 1건 처리.

    에러 분기:
      - 파싱 실패                → reject(requeue=False) / DLQ
      - 일기 목록 비어 있음 / 분석 불가(ValueError) → LIFESTYLE_ANALYSIS_FAILED + ack
      - asyncio.TimeoutError     → LIFESTYLE_ANALYSIS_FAILED(INFERENCE_TIMEOUT) + ack
      - 모든 일기 분석 실패(RuntimeError) → LIFESTYLE_ANALYSIS_FAILED + ack
      - 기타 추론 예외            → nack(requeue=False) / DLQ
    """
    log = logger.bind(delivery_tag=message.delivery_tag)

    # ── 1. JSON 파싱 ──────────────────────────────────────────────────────
    try:
      raw = json.loads(message.body.decode("utf-8"))
      request = LifestyleAnalyzeRequest.model_validate(raw)
    except Exception as parse_err:
      log.error("lifestyle.analyze 파싱 실패 — DLQ 이동", error=str(parse_err))
      MQ_DLQ_COUNT.labels(queue=LIFESTYLE_ANALYZE_QUEUE).inc()
      await message.reject(requeue=False)
      return

    # traceparent를 structlog contextvars에 바인딩
    if request.traceparent:
      structlog.contextvars.bind_contextvars(traceparent=request.traceparent)

    log = log.bind(
      messageId=request.messageId,
      userId=request.userId,
      diary_count=len(request.diaries),
      traceparent=request.traceparent,
    )
    log.info("lifestyle.analyze 메시지 수신")

    # ── 2~3. 라이프스타일 분석 (60초 타임아웃 적용) ────────────────────────
    try:
      lifestyle_result = await asyncio.wait_for(
        build_lifestyle_report(request),
        timeout=_LIFESTYLE_TIMEOUT_SECONDS,
      )

      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="LIFESTYLE_ANALYSIS_COMPLETED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        lifestyleResult=lifestyle_result,
      )
      await publisher.publish_ai_result(outbound)
      log.info("LIFESTYLE_ANALYSIS_COMPLETED 발행 완료")

    except ValueError as val_err:
      # 일기 목록 비어 있음 등 재시도 불필요 입력 오류
      log.warning("라이프스타일 분석 불가 (재시도 불가)", error=str(val_err))
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="LIFESTYLE_ANALYSIS_FAILED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INVALID_INPUT",
          detail=str(val_err),
        ),
      )
      await publisher.publish_ai_result(outbound)
      log.info("LIFESTYLE_ANALYSIS_FAILED 발행 완료 (입력 오류)")
      await message.ack()
      return

    except RuntimeError as rt_err:
      # 모든 일기 분석 실패 — 개별 모델 오류 누적
      log.error("라이프스타일 분석 전체 실패", error=str(rt_err))
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="LIFESTYLE_ANALYSIS_FAILED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="ALL_DIARIES_FAILED",
          detail=str(rt_err),
        ),
      )
      await publisher.publish_ai_result(outbound)
      log.info("LIFESTYLE_ANALYSIS_FAILED 발행 완료 (전체 분석 실패)")
      await message.ack()
      return

    except asyncio.TimeoutError:
      # 60초 초과 — 편수가 많거나 모델 부하 상황
      log.error(
        "라이프스타일 분석 추론 타임아웃",
        timeout_seconds=_LIFESTYLE_TIMEOUT_SECONDS,
        diary_count=len(request.diaries),
      )
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="LIFESTYLE_ANALYSIS_FAILED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INFERENCE_TIMEOUT",
          detail=f"{_LIFESTYLE_TIMEOUT_SECONDS}초 내 라이프스타일 분석이 완료되지 않았습니다.",
        ),
      )
      await publisher.publish_ai_result(outbound)
      await message.ack()
      return

    except Exception as exc:
      # 예상치 못한 예외 → DLQ
      log.error("라이프스타일 분석 중 예외 발생 — DLQ 이동", error=str(exc), exc_info=True)
      MQ_DLQ_COUNT.labels(queue=LIFESTYLE_ANALYZE_QUEUE).inc()
      await message.nack(requeue=False)
      return

    finally:
      structlog.contextvars.clear_contextvars()

    # ── 4. 정상 처리 완료 ── ack ────────────────────────────────────────────
    await message.ack()

  # ── user.vector.generate.q (M6 신규) ─────────────────────────────────────────

  async def _subscribe_user_vector_generate(self, publisher: MqPublisher) -> None:
    """
    user.vector.generate.q 구독 루프.

    prefetch=4 이유: KoSimCSE 단건 임베딩은 lifestyle 추론보다 가벼워
    복수의 요청을 동시 처리해도 CPU 경합이 낮다.
    단, run_in_executor 기반 동기 추론이므로 CPU 코어 수 이상은 불필요.
    """
    self._user_vector_connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with self._user_vector_connection:
      channel = await self._user_vector_connection.channel()
      # 단건 KoSimCSE 추론 → 병렬 4개까지 허용
      await channel.set_qos(prefetch_count=_USER_VECTOR_PREFETCH)

      # user.vector.generate.q 는 Spring M6 에서 선언됨
      queue = await channel.get_queue(USER_VECTOR_GENERATE_QUEUE)
      logger.info("MqConsumer 구독 시작", queue=USER_VECTOR_GENERATE_QUEUE)

      async with queue.iterator() as queue_iter:
        async for message in queue_iter:
          if not self._running:
            break
          await self._handle_user_vector_generate(message, publisher)

  async def _handle_user_vector_generate(
    self,
    message: AbstractIncomingMessage,
    publisher: MqPublisher,
  ) -> None:
    """
    user.vector.generate 메시지 1건 처리.

    에러 분기:
      - 파싱 실패                  → reject(requeue=False) / DLQ
      - 입력 텍스트 없음 / 짧음(ValueError) → USER_VECTOR_FAILED + ack
      - asyncio.TimeoutError       → USER_VECTOR_FAILED(INFERENCE_TIMEOUT) + ack
      - 기타 추론 예외              → nack(requeue=False) / DLQ
    """
    log = logger.bind(delivery_tag=message.delivery_tag)

    # ── 1. JSON 파싱 ──────────────────────────────────────────────────────
    try:
      raw = json.loads(message.body.decode("utf-8"))
      request = UserVectorGenerateRequest.model_validate(raw)
    except Exception as parse_err:
      log.error("user.vector.generate 파싱 실패 — DLQ 이동", error=str(parse_err))
      MQ_DLQ_COUNT.labels(queue=USER_VECTOR_GENERATE_QUEUE).inc()
      await message.reject(requeue=False)
      return

    # traceparent를 structlog contextvars에 바인딩
    if request.traceparent:
      structlog.contextvars.bind_contextvars(traceparent=request.traceparent)

    log = log.bind(
      messageId=request.messageId,
      userId=request.userId,
      source=request.source,
      traceparent=request.traceparent,
    )
    log.info("user.vector.generate 메시지 수신")

    # ── 2~3. 벡터 생성 (10초 타임아웃 적용) ────────────────────────────────
    try:
      vector_result = await asyncio.wait_for(
        generate_user_vector(request),
        timeout=_USER_VECTOR_TIMEOUT_SECONDS,
      )

      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="USER_VECTOR_GENERATED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        vectorResult=vector_result,
      )
      await publisher.publish_ai_result(outbound)
      log.info("USER_VECTOR_GENERATED 발행 완료", dimension=vector_result.dimension)

    except ValueError as val_err:
      # 입력 텍스트 없음 / 너무 짧음 — 재시도해도 동일 결과
      log.warning("벡터 생성 불가 (재시도 불가)", error=str(val_err))
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="USER_VECTOR_FAILED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INSUFFICIENT_TEXT",
          detail=str(val_err),
        ),
      )
      await publisher.publish_ai_result(outbound)
      log.info("USER_VECTOR_FAILED 발행 완료 (입력 오류)")
      await message.ack()
      return

    except asyncio.TimeoutError:
      # 10초 초과 — KoSimCSE 모델 부하 또는 긴 텍스트 truncation 지연
      log.error(
        "벡터 생성 추론 타임아웃",
        timeout_seconds=_USER_VECTOR_TIMEOUT_SECONDS,
      )
      outbound = AiAnalysisResult(
        originalMessageId=request.messageId,
        type="USER_VECTOR_FAILED",
        userId=request.userId,
        analyzedAt=_now_kst_iso(),
        traceparent=request.traceparent,
        error=AnalysisError(
          code="INFERENCE_TIMEOUT",
          detail=f"{_USER_VECTOR_TIMEOUT_SECONDS}초 내 벡터 생성이 완료되지 않았습니다.",
        ),
      )
      await publisher.publish_ai_result(outbound)
      await message.ack()
      return

    except Exception as exc:
      # 예상치 못한 예외 → DLQ
      log.error("벡터 생성 중 예외 발생 — DLQ 이동", error=str(exc), exc_info=True)
      MQ_DLQ_COUNT.labels(queue=USER_VECTOR_GENERATE_QUEUE).inc()
      await message.nack(requeue=False)
      return

    finally:
      structlog.contextvars.clear_contextvars()

    # ── 4. 정상 처리 완료 ── ack ────────────────────────────────────────────
    await message.ack()

  async def stop(self) -> None:
    """4개 구독 루프 정지 및 커넥션 종료."""
    self._running = False
    for conn_name, conn in [
      ("diary", self._diary_connection),
      ("report", self._report_connection),
      ("lifestyle", self._lifestyle_connection),
      ("user_vector", self._user_vector_connection),
    ]:
      if conn and not conn.is_closed:
        await conn.close()
        logger.info("MqConsumer 커넥션 종료", queue_group=conn_name)
