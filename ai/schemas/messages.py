"""
MQ 메시지 스키마 (Pydantic v2)

inbound:
  - DiaryAnalyzeRequest        : diary.analyze.v1 (M2)
  - ExchangeReportRequest      : exchange.report.v1 (M5)
  - LifestyleAnalyzeRequest    : lifestyle.analyze.v1 (M6)
  - UserVectorGenerateRequest  : user.vector.generate.v1 (M6)

outbound:
  - AiAnalysisResult           : ai.result.v1 (type 확장)
"""
from __future__ import annotations

import uuid
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── 공통: 일기 페이로드 ────────────────────────────────────────────────────────

class DiaryPayload(BaseModel):
  """일기 1편 ID + 본문 (교환일기 리포트 / 라이프스타일 분석 공용)"""
  diaryId: int
  content: str


class LifestyleDiaryPayload(BaseModel):
  """라이프스타일 분석용 일기 1편 페이로드 (createdAt 포함, 하위 호환 유지)"""
  diaryId: int
  content: str
  createdAt: Optional[str] = Field(default=None, description="ISO-8601 KST (optional)")


# ── diary.analyze.v1 inbound ─────────────────────────────────────────────────

class DiaryAnalyzeRequest(BaseModel):
  """Spring → FastAPI: diary.analyze.v1 inbound 스키마"""
  messageId: str = Field(..., description="메시지 UUID")
  version: str = Field(default="v1")
  diaryId: int
  userId: int
  content: str
  publishedAt: str = Field(..., description="ISO-8601 KST")
  traceparent: Optional[str] = None


# ── exchange.report.v1 inbound (M5 신규) ─────────────────────────────────────

class ExchangeReportRequest(BaseModel):
  """Spring → FastAPI: exchange.report.v1 inbound 스키마"""
  messageId: str = Field(..., description="메시지 UUID")
  version: str = Field(default="v1")
  reportId: int
  roomId: int
  userAId: int
  userBId: int
  diariesA: list[DiaryPayload] = Field(..., description="사용자 A의 일기 목록")
  diariesB: list[DiaryPayload] = Field(..., description="사용자 B의 일기 목록")
  publishedAt: str = Field(..., description="ISO-8601 KST")
  traceparent: Optional[str] = None


# ── 공통 태그 / 분석 결과 ──────────────────────────────────────────────────────

class AnalysisTag(BaseModel):
  """태그 1건 (감정/라이프스타일/관계스타일/톤)"""
  type: Literal["EMOTION", "LIFESTYLE", "RELATIONSHIP_STYLE", "TONE"]
  label: str
  score: float = Field(..., ge=0.0, le=1.0)


class AnalysisResult(BaseModel):
  """KcELECTRA 추론 결과 6종 (diary.analyze.v1 전용)"""
  summary: str = Field(..., max_length=50, description="본문 요약 50자 이내")
  category: Literal["DAILY", "TRAVEL", "FOOD", "RELATIONSHIP", "WORK"]
  tags: list[AnalysisTag]


class AnalysisError(BaseModel):
  """분석 실패 시 에러 정보"""
  code: str = Field(..., description="예: INFERENCE_TIMEOUT, CONTENT_TOO_SHORT")
  detail: str


# ── exchange.report.v1 outbound 결과 (M5 신규) ───────────────────────────────

class ExchangeResult(BaseModel):
  """교환일기 완주 리포트 AI 분석 결과"""
  commonKeywords: list[str] = Field(..., description="TF-IDF 기반 공통 키워드 (최대 7개)")
  emotionSimilarity: float = Field(
    ...,
    ge=0.0,
    le=1.0,
    description="KoSimCSE 코사인 유사도 (0~1 정규화)",
  )
  lifestylePatterns: list[str] = Field(
    ...,
    description="KcELECTRA lifestyle_tags 교집합 (최대 5개)",
  )
  writingTempA: float = Field(..., ge=0.0, le=1.0, description="사용자 A 글쓰기 온도")
  writingTempB: float = Field(..., ge=0.0, le=1.0, description="사용자 B 글쓰기 온도")
  aiDescription: str = Field(
    ...,
    max_length=60,
    description="60자 이내 한국어 AI 설명",
  )


# ── lifestyle.analyze.v1 inbound (M6 신규) ───────────────────────────────────

class LifestyleAnalyzeRequest(BaseModel):
  """
  Spring → FastAPI: lifestyle.analyze.v1 inbound 스키마.

  diaries: DiaryPayload 목록 (최대 20편, createdAt 없이 diaryId+content만 전달).
  하위 호환을 위해 LifestyleDiaryPayload(createdAt 포함)도 model_validate로 수용된다.
  """
  messageId: str = Field(..., description="메시지 UUID")
  version: str = Field(default="v1")
  userId: int
  diaries: list[DiaryPayload] = Field(
    ..., description="분석 대상 최근 일기 목록 (최대 20편)"
  )
  publishedAt: str = Field(..., description="ISO-8601 KST")
  traceparent: Optional[str] = None


# ── user.vector.generate.v1 inbound (M6 신규) ─────────────────────────────────

class UserVectorGenerateRequest(BaseModel):
  """
  Spring → FastAPI: user.vector.generate.v1 inbound 스키마.

  sourceText: 단일 문자열 (일기 연결본 / 이상형 키워드 / 혼합 텍스트).
  하위 호환을 위해 texts: list[str] 필드도 유지 (둘 중 하나만 있으면 됨).
  """
  messageId: str = Field(..., description="메시지 UUID")
  version: str = Field(default="v1")
  userId: int
  source: Literal["DIARY", "IDEAL_KEYWORDS", "MIXED"] = Field(
    ..., description="임베딩 생성 소스"
  )
  # Spring M6 확정 필드: 단일 문자열 입력
  sourceText: Optional[str] = Field(
    default=None, description="임베딩 입력 텍스트 (단일 문자열, 권장)"
  )
  # 하위 호환 필드: 텍스트 목록 (비어 있지 않으면 공백 join 후 임베딩)
  texts: Optional[list[str]] = Field(
    default=None, description="임베딩 입력 텍스트 목록 (하위 호환, sourceText 우선)"
  )
  publishedAt: str = Field(..., description="ISO-8601 KST")
  traceparent: Optional[str] = None

  def resolve_source_text(self) -> str:
    """
    sourceText 또는 texts 중 유효한 입력을 반환.
    우선순위: sourceText > texts join
    둘 다 없으면 ValueError 발생.
    """
    if self.sourceText and self.sourceText.strip():
      return self.sourceText.strip()
    if self.texts:
      joined = " ".join(t for t in self.texts if t.strip())
      if joined.strip():
        return joined.strip()
    raise ValueError("sourceText 또는 texts 중 하나는 반드시 제공되어야 합니다.")


# ── lifestyle.analyze.v1 outbound 결과 (M6 신규) ─────────────────────────────

class EmotionProfile(BaseModel):
  """감정 비율 프로필 (positive/negative/neutral 합계 ≈ 1.0)"""
  positive: float = Field(..., ge=0.0, le=1.0)
  negative: float = Field(..., ge=0.0, le=1.0)
  neutral: float = Field(..., ge=0.0, le=1.0)


class LifestyleResult(BaseModel):
  """라이프스타일 분석 AI 분석 결과"""
  dominantPatterns: list[str] = Field(
    ..., description="주요 라이프스타일 패턴 top 3~5"
  )
  emotionProfile: EmotionProfile
  keywords: list[AnalysisTag] = Field(
    ..., description="라이프스타일 키워드 상세 목록 (type/label/score)"
  )
  summary: str = Field(..., max_length=60, description="60자 이내 한국어 설명")


# ── user.vector.generate.v1 outbound 결과 (M6 신규) ──────────────────────────

class VectorResult(BaseModel):
  """사용자 임베딩 벡터 생성 결과"""
  embeddingBase64: str = Field(..., description="768차원 float16 벡터 Base64 인코딩")
  dimension: int = Field(default=768)
  source: Literal["DIARY", "IDEAL_KEYWORDS", "MIXED"]


# ── ai.result.v1 outbound (type 확장) ────────────────────────────────────────

class AiAnalysisResult(BaseModel):
  """FastAPI → Spring: ai.result.v1 outbound 스키마 (M2 + M5 타입 통합)"""
  messageId: str = Field(
    default_factory=lambda: str(uuid.uuid4()),
    description="새로 발급된 UUID",
  )
  originalMessageId: str = Field(..., description="inbound messageId 그대로 복사")
  version: str = Field(default="v1")
  type: Literal[
    "DIARY_ANALYSIS_COMPLETED",
    "DIARY_ANALYSIS_FAILED",
    "EXCHANGE_REPORT_COMPLETED",
    "EXCHANGE_REPORT_FAILED",
    "LIFESTYLE_ANALYSIS_COMPLETED",    # M6 신규
    "LIFESTYLE_ANALYSIS_FAILED",       # M6 신규
    "USER_VECTOR_GENERATED",           # M6 신규
    "USER_VECTOR_FAILED",              # M6 신규
  ]
  # diary.analyze.v1 전용 필드
  diaryId: Optional[int] = None
  userId: Optional[int] = None
  # exchange.report.v1 전용 필드 (M5 신규)
  reportId: Optional[int] = None
  roomId: Optional[int] = None
  analyzedAt: str = Field(..., description="ISO-8601 KST")
  traceparent: Optional[str] = None
  result: Optional[AnalysisResult] = None
  exchangeResult: Optional[ExchangeResult] = None
  error: Optional[AnalysisError] = None
  # M6 신규 필드
  lifestyleResult: Optional[LifestyleResult] = None
  vectorResult: Optional[VectorResult] = None
