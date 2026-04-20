"""
사용자 임베딩 벡터 생성 서비스 (M6)

처리 파이프라인:
  1. request.resolve_source_text() → 유효한 단일 문자열 확보
     (sourceText 우선, 없으면 texts 공백 join)
  2. 최소 길이 검증 (50자 미만 → ValueError: INSUFFICIENT_TEXT)
  3. kosimcse_service.embed_to_base64(text) → Base64 인코딩 float16 bytes
     (동기 CPU 추론 → run_in_executor 위임, event loop 블로킹 방지)
  4. VectorResult(embeddingBase64, dimension=768, source) 반환

설계:
  - KoSimCSE mean pooling 임베딩 사용 (768차원 float16 = 1536 bytes)
  - 512 토큰 제한: 긴 텍스트는 KoSimCSE tokenizer에서 자동 truncation
  - sourceText / texts 양방향 입력 지원 (Spring M6 확정 스펙 + 하위 호환)
"""
from __future__ import annotations

import asyncio

import structlog

from schemas.messages import UserVectorGenerateRequest, VectorResult
from services import kosimcse_service

logger = structlog.get_logger(__name__)

# 임베딩 생성을 위한 최소 입력 텍스트 길이 (자)
_MIN_SOURCE_TEXT_LENGTH: int = 50


async def generate_user_vector(request: UserVectorGenerateRequest) -> VectorResult:
  """
  사용자 임베딩 벡터를 생성하여 VectorResult를 반환한다.

  Steps:
    1. resolve_source_text() — sourceText 또는 texts join으로 단일 문자열 확보
    2. 최소 길이 검증 (50자 미만 → ValueError: INSUFFICIENT_TEXT)
    3. KoSimCSE embed_to_base64 호출 (동기 → run_in_executor 위임)
    4. VectorResult 반환

  :param request: UserVectorGenerateRequest 요청 객체
  :return: VectorResult (embeddingBase64, dimension=768, source)
  :raises ValueError: 입력 텍스트가 없거나 50자 미만일 때 (INSUFFICIENT_TEXT)
  :raises Exception: KoSimCSE 추론 실패 시 상위로 전파
  """
  log = logger.bind(userId=request.userId, source=request.source)

  # ── 1. 입력 텍스트 확보 ────────────────────────────────────────────────────
  # resolve_source_text()는 sourceText, texts 순으로 유효한 입력을 반환.
  # 둘 다 없으면 내부에서 ValueError를 발생시킨다.
  try:
    source_text: str = request.resolve_source_text()
  except ValueError as e:
    raise ValueError(f"INSUFFICIENT_TEXT: {e}") from e

  # ── 2. 최소 길이 검증 ─────────────────────────────────────────────────────
  # 50자 미만은 KoSimCSE 임베딩 품질이 지나치게 낮아 매칭에 악영향을 준다.
  if len(source_text) < _MIN_SOURCE_TEXT_LENGTH:
    raise ValueError(
      f"INSUFFICIENT_TEXT: 입력 텍스트가 너무 짧습니다. "
      f"최소 {_MIN_SOURCE_TEXT_LENGTH}자 필요 (현재: {len(source_text)}자)."
    )

  log.info(
    "user_vector 임베딩 생성 시작",
    text_length=len(source_text),
  )

  # ── 3. KoSimCSE 임베딩 (동기 CPU 작업 → executor 위임) ──────────────────
  # KoSimCSE는 512 토큰 제한 → 긴 텍스트는 내부에서 자동 truncation.
  loop = asyncio.get_event_loop()
  embedding_base64: str = await loop.run_in_executor(
    None,
    kosimcse_service.embed_to_base64,
    source_text,
  )

  log.info("user_vector 임베딩 생성 완료")

  # ── 4. VectorResult 반환 ─────────────────────────────────────────────────
  return VectorResult(
    embeddingBase64=embedding_base64,
    dimension=768,
    source=request.source,
  )
