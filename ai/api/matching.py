"""
매칭 계산 API 엔드포인트.

POST /api/matching/calculate
  - Spring에서 기준 사용자 임베딩 + 이상형 키워드 + 후보 목록(임베딩 + 퍼스널리티 키워드) 수신
  - 점수 수식: 0.6 × Jaccard(이상형키워드 ∩ 퍼스널리티키워드) + 0.4 × (cosine+1)/2
  - X-Internal-Key 헤더 검증 (공통 deps.verify_internal_key)
  - FastAPI DB 직접 쓰기 금지 원칙 준수 (설계서 9.3§)

POST /api/matching/embed
  - 텍스트 목록 → KoSimCSE float16 임베딩 → Base64 반환
  - Spring lazy 생성: 기준 사용자 user_vector 없을 때 이상형 키워드 임베딩 요청
"""
from __future__ import annotations

import base64
import structlog
from fastapi import APIRouter, Depends, HTTPException, status

from api.deps import verify_internal_key
from schemas.matching import (
    CandidatePayload,
    CandidateScore,
    EmbedRequest,
    EmbedResponse,
    MatchingCalculateRequest,
    MatchingCalculateResponse,
    ScoreBreakdown,
)
from services import kosimcse_service

logger = structlog.get_logger(__name__)

router = APIRouter(dependencies=[Depends(verify_internal_key)])


# ── 유틸 함수 ─────────────────────────────────────────────────────────────────

def _jaccard(set_a: set[str], set_b: set[str]) -> float:
    """
    두 집합의 Jaccard 유사도를 계산한다.
    합집합이 비어있으면 0.0 반환.

    J(A, B) = |A ∩ B| / |A ∪ B|
    """
    if not set_a and not set_b:
        return 0.0
    union = set_a | set_b
    intersection = set_a & set_b
    return len(intersection) / len(union)


def _cosine_normalized(base64_a: str, base64_b: str) -> float:
    """
    두 Base64 float16 벡터의 코사인 유사도를 0~1로 정규화.
    코사인 범위: -1.0 ~ 1.0 → (cosine + 1) / 2 → 0.0 ~ 1.0
    """
    raw_cosine = kosimcse_service.cosine_from_base64(base64_a, base64_b)
    return (raw_cosine + 1.0) / 2.0


def _compute_score(
    user_embedding_b64: str,
    ideal_keywords: list[str],
    candidate: CandidatePayload,
) -> tuple[float, ScoreBreakdown]:
    """
    단일 후보에 대한 매칭 점수를 계산한다.

    점수 수식:
      score = 0.6 × jaccard + 0.4 × (cosine + 1) / 2

    :param user_embedding_b64: 기준 사용자 임베딩 Base64 (null이면 코사인 0.5 처리)
    :param ideal_keywords:     기준 사용자 이상형 키워드 텍스트 목록
    :param candidate:          후보 사용자 페이로드
    :return: (matchingScore, ScoreBreakdown)
    """
    # ── Jaccard 계산 ──────────────────────────────────────────────────────────
    ideal_set = set(ideal_keywords)
    personality_set = set(candidate.personalityKeywords)
    jaccard = _jaccard(ideal_set, personality_set)

    # ── 코사인 유사도 계산 ────────────────────────────────────────────────────
    if user_embedding_b64 and candidate.embedding:
        cosine_norm = _cosine_normalized(user_embedding_b64, candidate.embedding)
    else:
        # 임베딩 없으면 중립값 0.5 사용 (점수 계산 유지)
        cosine_norm = 0.5

    # ── 최종 점수 ─────────────────────────────────────────────────────────────
    score = round(0.6 * jaccard + 0.4 * cosine_norm, 6)

    breakdown = ScoreBreakdown(
        keywordOverlap=round(jaccard, 6),
        cosineSimilarity=round(cosine_norm, 6),
    )
    return score, breakdown


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.post(
    "/matching/calculate",
    response_model=MatchingCalculateResponse,
    summary="매칭 점수 계산",
    description=(
        "기준 사용자와 후보 목록에 대해 매칭 점수를 계산한다.\n\n"
        "점수 수식: `0.6 × Jaccard(이상형키워드 ∩ 퍼스널리티키워드) + 0.4 × (cosine+1)/2`\n\n"
        "기준 사용자 임베딩(userEmbedding)이 null이면 idealKeywords를 join → KoSimCSE 임베딩 동적 생성."
    ),
)
def calculate_matching(
    body: MatchingCalculateRequest,
) -> MatchingCalculateResponse:
    """
    매칭 점수 계산 처리 로직.

    Steps:
      1. X-Internal-Key 헤더 검증 (router-level Depends)
      2. 기준 사용자 임베딩 확보:
         a. userEmbedding 있으면 사용
         b. 없으면 idealKeywords join → KoSimCSE 임베딩 생성
      3. 각 후보에 대해:
         - embedding null인 후보 스킵
         - Jaccard 계산 (이상형키워드 vs 퍼스널리티키워드)
         - 코사인 유사도 계산 (정규화 0~1)
         - score = 0.6 × jaccard + 0.4 × cosine_norm
      4. matchingScore 내림차순 정렬 후 반환
    """
    logger.info(
        "매칭 계산 요청",
        userId=body.userId,
        candidateCount=len(body.candidates),
        hasUserEmbedding=body.userEmbedding is not None,
    )

    # ── 기준 사용자 임베딩 확보 ──────────────────────────────────────────────
    user_embedding_b64: str | None = body.userEmbedding

    if user_embedding_b64 is None:
        if body.idealKeywords:
            # 이상형 키워드 join → KoSimCSE 임베딩 동적 생성
            joined_text = " ".join(body.idealKeywords)
            logger.info(
                "기준 사용자 임베딩 동적 생성",
                userId=body.userId,
                keywordCount=len(body.idealKeywords),
            )
            user_embedding_b64 = kosimcse_service.embed_to_base64(joined_text)
        else:
            # 임베딩도 키워드도 없음 → 코사인 계산 불가 (Jaccard만으로 점수 계산)
            logger.warning("기준 사용자 임베딩 + 이상형 키워드 모두 없음", userId=body.userId)

    # ── 후보별 점수 계산 ─────────────────────────────────────────────────────
    scores: list[CandidateScore] = []

    for candidate in body.candidates:
        # 임베딩 없는 후보 스킵
        if candidate.embedding is None:
            logger.debug("후보 임베딩 없음 — 스킵", candidateId=candidate.userId)
            continue

        try:
            score, breakdown = _compute_score(
                user_embedding_b64=user_embedding_b64,
                ideal_keywords=body.idealKeywords,
                candidate=candidate,
            )
            scores.append(
                CandidateScore(
                    userId=candidate.userId,
                    matchingScore=score,
                    breakdown=breakdown,
                )
            )
        except Exception as e:
            # 개별 후보 계산 실패 시 해당 후보 스킵 (전체 중단 방지)
            logger.warning(
                "후보 점수 계산 실패 — 스킵",
                candidateId=candidate.userId,
                error=str(e),
            )
            continue

    # matchingScore 내림차순 정렬
    scores.sort(key=lambda s: s.matchingScore, reverse=True)

    logger.info(
        "매칭 계산 완료",
        userId=body.userId,
        scoredCount=len(scores),
    )

    return MatchingCalculateResponse(scores=scores)


@router.post(
    "/matching/embed",
    response_model=EmbedResponse,
    summary="KoSimCSE 텍스트 임베딩",
    description=(
        "텍스트 목록을 KoSimCSE로 임베딩해 Base64 인코딩 float16 bytes 목록을 반환한다.\n\n"
        "Spring이 기준 사용자의 user_vector가 없을 때 이상형 키워드 임베딩을 위해 호출."
    ),
)
def embed_texts(
    body: EmbedRequest,
) -> EmbedResponse:
    """
    KoSimCSE 임베딩 처리 로직.

    Steps:
      1. X-Internal-Key 헤더 검증 (router-level Depends)
      2. 각 텍스트를 KoSimCSE mean pooling 임베딩
      3. float32 → float16 → Base64 인코딩 후 반환
    """
    if not body.texts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="texts 목록이 비어있습니다.",
        )

    logger.info("임베딩 요청", count=len(body.texts))

    try:
        embeddings_b64 = kosimcse_service.embed_batch_to_base64(body.texts)
    except Exception as e:
        logger.error("임베딩 실패", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"임베딩 처리 중 오류가 발생했습니다: {e}",
        )

    logger.info("임베딩 완료", count=len(embeddings_b64))
    return EmbedResponse(embeddings=embeddings_b64)
