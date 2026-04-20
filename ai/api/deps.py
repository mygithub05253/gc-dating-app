"""
공통 FastAPI 의존성 (Dependencies).

- verify_internal_key: Spring → FastAPI 내부 통신 X-Internal-Key 헤더 검증.
  content_scan.py, matching.py 등 내부 API에서 공통 재사용.
"""
from __future__ import annotations

import structlog
from fastapi import Header, HTTPException, status

from config import INTERNAL_API_KEY

logger = structlog.get_logger(__name__)


def verify_internal_key(x_internal_key: str = Header(..., alias="X-Internal-Key")) -> None:
    """
    X-Internal-Key 헤더 검증.
    Spring → FastAPI 내부 통신에만 허용. 불일치 시 401 반환.
    """
    if x_internal_key != INTERNAL_API_KEY:
        logger.warning("내부 API 키 불일치 — 접근 거부")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 내부 API 키입니다.",
        )
