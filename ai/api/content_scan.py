"""
콘텐츠 스캔 API 엔드포인트.

POST /api/content/scan
  - X-Internal-Key 헤더 검증 (Spring → FastAPI 내부 통신)
  - 외부 연락처 정규식 탐지 (전화번호, 카카오ID, 이메일, 인스타그램, URL)
  - DB 직접 접근 없음 (설계서 9.§ 보안 규칙)
  - 금칙어 검사는 Spring 측 localRegexScan이 담당; FastAPI는 정규식 패턴만 적용

설계서 3.4절: Spring이 동기 HTTP로 호출, 3초 타임아웃 적용
"""
from __future__ import annotations

import re
import structlog
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from api.deps import verify_internal_key
from config import INTERNAL_API_KEY

logger = structlog.get_logger(__name__)

router = APIRouter()


# ── 외부 연락처 탐지 정규식 패턴 ─────────────────────────────────────────────
# 각 패턴 키는 blockedReasons의 category 값으로 사용된다.
PATTERNS: dict[str, re.Pattern[str]] = {
    # 한국 휴대전화 번호 (010, 011, 016, 017, 018, 019)
    "EXTERNAL_CONTACT_PHONE": re.compile(
        r"\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b"
    ),
    # 카카오톡 ID 유도 표현
    "EXTERNAL_CONTACT_KAKAO": re.compile(
        r"(?:카톡|카카오톡|카카오|kakao)[\s:]*[A-Za-z0-9_]{3,}",
        re.IGNORECASE,
    ),
    # 이메일 주소
    "EXTERNAL_CONTACT_EMAIL": re.compile(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}"
    ),
    # 인스타그램 계정 유도 표현 또는 @handle
    "EXTERNAL_CONTACT_INSTAGRAM": re.compile(
        r"(?:인스타|instagram)[\s]*@?[A-Za-z0-9._]{3,30}",
        re.IGNORECASE,
    ),
    # 텔레그램 링크
    "EXTERNAL_CONTACT_TELEGRAM": re.compile(
        r"(?:t\.me|telegram\.me)/[A-Za-z0-9_]{3,}",
        re.IGNORECASE,
    ),
    # 일반 URL (https?://)
    "EXTERNAL_CONTACT_URL": re.compile(
        r"https?://[^\s]+"
    ),
}


# ── 요청/응답 스키마 ──────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    """콘텐츠 스캔 요청 바디."""
    content: str


class BlockedReason(BaseModel):
    """개별 차단 사유."""
    category: str
    matchedToken: str


class ScanResponse(BaseModel):
    """콘텐츠 스캔 응답."""
    allowed: bool
    blockedReasons: list[BlockedReason]


# ── 내부 API 키 검증 의존성 ───────────────────────────────────────────────────

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


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.post(
    "/content/scan",
    response_model=ScanResponse,
    summary="콘텐츠 스캔 (외부 연락처 탐지)",
    description=(
        "일기 본문에서 외부 연락처 유도 패턴(전화번호, 카카오ID, 이메일, 인스타그램, URL 등)을 "
        "정규식으로 탐지한다. DB 직접 접근 없음."
    ),
)
def scan_content(
    body: ScanRequest,
    x_internal_key: str = Header(..., alias="X-Internal-Key"),
) -> ScanResponse:
    """
    콘텐츠 스캔 처리 로직.

    1. X-Internal-Key 헤더 검증
    2. 각 정규식 패턴으로 매칭 검사
    3. 매칭된 항목이 있으면 allowed=False + blockedReasons 반환
    4. 모두 통과 시 allowed=True 반환
    """
    # 내부 API 키 검증
    verify_internal_key(x_internal_key)

    content = body.content
    blocked_reasons: list[BlockedReason] = []

    for category, pattern in PATTERNS.items():
        matches = pattern.findall(content)
        for matched in matches:
            # findall이 tuple을 반환할 경우 대비 (그룹이 있는 패턴)
            token = matched if isinstance(matched, str) else matched[0]
            blocked_reasons.append(BlockedReason(category=category, matchedToken=token))
            logger.debug("콘텐츠 스캔 탐지", category=category, token=token)

    allowed = len(blocked_reasons) == 0

    if not allowed:
        logger.info(
            "콘텐츠 스캔 차단",
            reasons_count=len(blocked_reasons),
            first_category=blocked_reasons[0].category,
        )
    else:
        logger.debug("콘텐츠 스캔 통과")

    return ScanResponse(allowed=allowed, blockedReasons=blocked_reasons)
