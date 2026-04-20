"""
RabbitMQ ai.result.v1 발행자 (aio-pika 기반)
ai.exchange 에 ai.result.v1 라우팅 키로 발행.
앱 lifespan 에서 싱글턴으로 관리.
"""
from __future__ import annotations

import json
import logging

import aio_pika
from aio_pika.abc import AbstractRobustConnection, AbstractChannel, AbstractExchange

from config import AI_EXCHANGE, AI_RESULT_ROUTING_KEY, RABBITMQ_URL
from schemas.messages import AiAnalysisResult

logger = logging.getLogger(__name__)


class MqPublisher:
  """ai.result.v1 메시지를 ai.exchange 에 발행하는 비동기 퍼블리셔."""

  def __init__(self) -> None:
    self._connection: AbstractRobustConnection | None = None
    self._channel: AbstractChannel | None = None
    self._exchange: AbstractExchange | None = None

  async def connect(self) -> None:
    """aio-pika robust 커넥션 연결 및 Exchange 바인딩."""
    self._connection = await aio_pika.connect_robust(RABBITMQ_URL)
    self._channel = await self._connection.channel()
    # ai.exchange 는 Spring M1 에서 이미 선언됨 — passive=True 로 존재만 확인
    self._exchange = await self._channel.get_exchange(AI_EXCHANGE)
    logger.info("MqPublisher 연결 완료: exchange=%s", AI_EXCHANGE)

  async def publish_ai_result(self, result: AiAnalysisResult) -> None:
    """
    AiAnalysisResult 를 ai.exchange 에 ai.result.v1 라우팅 키로 발행.
    헤더에 messageId / traceparent 를 추가해 분산 추적 지원.
    """
    if self._exchange is None:
      raise RuntimeError("MqPublisher.connect() 를 먼저 호출해야 합니다.")

    payload = result.model_dump_json().encode("utf-8")

    # 메시지 헤더: traceparent 전파 및 messageId 복사
    headers: dict[str, str] = {
      "messageId": result.messageId,
    }
    if result.traceparent:
      headers["traceparent"] = result.traceparent

    message = aio_pika.Message(
      body=payload,
      content_type="application/json",
      headers=headers,
      delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # 내구성 보장
    )

    await self._exchange.publish(
      message,
      routing_key=AI_RESULT_ROUTING_KEY,
    )
    logger.debug(
      "ai.result.v1 발행 완료: messageId=%s diaryId=%s type=%s",
      result.messageId,
      result.diaryId,
      result.type,
    )

  async def close(self) -> None:
    """커넥션 종료."""
    if self._connection and not self._connection.is_closed:
      await self._connection.close()
      logger.info("MqPublisher 커넥션 종료")
