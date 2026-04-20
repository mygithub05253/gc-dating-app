"""
FastAPI 메인 앱
- lifespan: 모델 warmup → 앵커 임베딩 선점 → MQ Publisher/Consumer 시작
- 기존 /health, /ready, /warmup, /embed 엔드포인트 유지
- Prometheus instrumentator 설정 (M7: /metrics 엔드포인트 활성화)
- structlog JSON 포맷 로깅 설정 (M7)
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
import structlog.contextvars
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel

from models import get_kcelectra, get_kosimcse
from observability.logging import configure_logging
from services.kcelectra_service import warmup_anchors
from workers.mq_consumer import MqConsumer
from workers.mq_publisher import MqPublisher
from api import content_scan, matching
import torch

# ── 구조화 JSON 로깅 초기화 (M7) ────────────────────────────────────────────────
# lifespan 이전에 한 번만 호출해 모든 structlog 출력이 JSON 포맷이 되도록 설정
configure_logging()
logger = structlog.get_logger(__name__)


# ── lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
  """
  앱 시작/종료 시 실행되는 lifespan 핸들러.
  시작: 모델 warmup → 앵커 임베딩 선점 → MQ 연결 → Consumer 태스크 등록
  종료: Consumer/Publisher 커넥션 닫기
  """
  # ── 시작 ──────────────────────────────────────────────────────────────────
  logger.info("앱 시작: KcELECTRA / KoSimCSE 모델 warmup 중...")
  get_kcelectra()
  get_kosimcse()
  logger.info("모델 로드 완료")

  # 앵커 임베딩 선점 — 첫 요청 지연 제거
  logger.info("앵커 임베딩 선점 중...")
  warmup_anchors()
  logger.info("앵커 임베딩 선점 완료")

  # MQ Publisher 연결
  publisher = MqPublisher()
  await publisher.connect()
  app.state.publisher = publisher

  # MQ Consumer 비동기 태스크 시작
  consumer = MqConsumer()
  app.state.consumer = consumer
  consumer_task = asyncio.create_task(consumer.start(publisher))
  app.state.consumer_task = consumer_task
  logger.info("MQ Consumer 태스크 등록 완료")

  yield  # 앱 실행

  # ── 종료 ──────────────────────────────────────────────────────────────────
  logger.info("앱 종료: Consumer/Publisher 정리 중...")
  await consumer.stop()
  consumer_task.cancel()
  try:
    await consumer_task
  except asyncio.CancelledError:
    pass
  await publisher.close()
  logger.info("앱 종료 완료")


# ── FastAPI 앱 ────────────────────────────────────────────────────────────────

app = FastAPI(
  title="Ember AI Server",
  version="1.0.0",
  lifespan=lifespan,
)

# Prometheus 메트릭 노출 (/metrics 엔드포인트)
Instrumentator().instrument(app).expose(app)

# 콘텐츠 스캔 라우터 등록 (prefix: /api)
app.include_router(content_scan.router, prefix="/api")

# 매칭 계산 라우터 등록 (prefix: /api)
app.include_router(matching.router, prefix="/api")


# ── 기존 엔드포인트 (유지) ────────────────────────────────────────────────────

@app.get("/health")
def health():
  return {"status": "ok"}


@app.post("/warmup")
def warmup():
  get_kcelectra()
  get_kosimcse()
  return {"status": "warmed_up", "models": ["kcelectra", "kosimcse"]}


@app.get("/ready")
def ready():
  k_loaded = get_kcelectra.cache_info().currsize > 0
  s_loaded = get_kosimcse.cache_info().currsize > 0
  status = "ready" if (k_loaded and s_loaded) else "loading"
  return {"status": status, "kcelectra": k_loaded, "kosimcse": s_loaded}


class TextIn(BaseModel):
  text: str


@app.post("/embed")
def embed(body: TextIn):
  tok, mdl = get_kcelectra()
  with torch.no_grad():
    inputs = tok(body.text, return_tensors="pt", truncation=True, max_length=128)
    out = mdl(**inputs).last_hidden_state.mean(dim=1).squeeze().tolist()
  return {"embedding": out}
