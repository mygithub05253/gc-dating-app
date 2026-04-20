"""
매칭 계산 API 스키마 (Pydantic v2).

엔드포인트:
  POST /api/matching/calculate  — 후보 점수 계산
  POST /api/matching/embed      — KoSimCSE 텍스트 임베딩 (Spring lazy 생성용)
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ── /api/matching/embed 스키마 ────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    """텍스트 목록 임베딩 요청."""
    texts: list[str] = Field(..., min_length=1, description="임베딩할 텍스트 목록")


class EmbedResponse(BaseModel):
    """임베딩 결과 (Base64 float16)."""
    embeddings: list[str] = Field(..., description="Base64 인코딩 float16 바이트 목록")


# ── /api/matching/calculate 스키마 ───────────────────────────────────────────

class CandidatePayload(BaseModel):
    """후보 사용자 1건 페이로드."""
    userId: int
    embedding: Optional[str] = Field(
        None,
        description="float16 벡터 Base64 인코딩. null이면 해당 후보 스킵.",
    )
    personalityKeywords: list[str] = Field(
        default_factory=list,
        description="AI 분석 퍼스널리티 키워드 label 목록",
    )


class MatchingCalculateRequest(BaseModel):
    """
    Spring → FastAPI 매칭 계산 요청 바디.

    userEmbedding이 null이면 idealKeywords를 join → KoSimCSE 임베딩 동적 생성.
    """
    userId: int
    userEmbedding: Optional[str] = Field(
        None,
        description="기준 사용자 float16 임베딩 Base64. null이면 idealKeywords로 동적 생성.",
    )
    idealKeywords: list[str] = Field(
        default_factory=list,
        description="기준 사용자 이상형 키워드 텍스트 목록",
    )
    candidates: list[CandidatePayload] = Field(
        ...,
        description="후보 사용자 목록 (최대 50명)",
    )


class ScoreBreakdown(BaseModel):
    """점수 세부 내역."""
    keywordOverlap: float = Field(..., ge=0.0, le=1.0, description="이상형 키워드 Jaccard 유사도")
    cosineSimilarity: float = Field(..., ge=0.0, le=1.0, description="코사인 유사도 (0~1 정규화)")


class CandidateScore(BaseModel):
    """후보 1건 점수 결과."""
    userId: int
    matchingScore: float = Field(..., ge=0.0, le=1.0)
    breakdown: ScoreBreakdown


class MatchingCalculateResponse(BaseModel):
    """매칭 계산 응답 (matchingScore 내림차순 정렬)."""
    scores: list[CandidateScore]
