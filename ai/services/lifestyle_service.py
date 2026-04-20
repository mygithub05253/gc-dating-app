"""
라이프스타일 분석 서비스 (M6)

처리 파이프라인:
  1. 각 일기별 kcelectra_service.analyze_diary() 병렬 호출 (asyncio.gather)
  2. lifestyle_tags 집계 → score 합산 → top 3~5 dominant_patterns 선정
  3. emotion_tags 분류 (positive/negative/neutral 버킷) → 비율 계산
  4. 모든 태그를 keywords 목록으로 플래튼
  5. summary 템플릿 생성 (60자 이내)

감정 버킷 분류:
  - POSITIVE_EMOTIONS: 긍정 감정 레이블 집합
  - NEGATIVE_EMOTIONS: 부정 감정 레이블 집합
  - NEUTRAL_EMOTIONS: 중립 감정 레이블 집합
  - 미분류 레이블은 NEUTRAL로 처리
"""
from __future__ import annotations

import asyncio
from typing import Any

from schemas.messages import (
  AnalysisTag,
  EmotionProfile,
  LifestyleAnalyzeRequest,
  LifestyleResult,
)
from services import kcelectra_service

# ── 감정 버킷 분류 상수 ────────────────────────────────────────────────────────

POSITIVE_EMOTIONS: frozenset[str] = frozenset({
  "기쁨", "설렘", "감사", "희망", "사랑", "평온", "편안함", "활력",
  "기대", "만족", "자부심", "안도",
})

NEGATIVE_EMOTIONS: frozenset[str] = frozenset({
  "슬픔", "분노", "불안", "외로움", "피로", "실망", "두려움",
  "수치심", "후회", "공허함", "그리움",
})

NEUTRAL_EMOTIONS: frozenset[str] = frozenset({
  "놀람", "지루함",
})

# 라이프스타일 dominant_patterns 최소/최대 수
_DOMINANT_MIN: int = 3
_DOMINANT_MAX: int = 5

# 라이프스타일 요약 최대 글자 수
_SUMMARY_MAX_CHARS: int = 60


# ── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _classify_emotion(label: str) -> str:
  """감정 레이블을 positive / negative / neutral 버킷으로 분류."""
  if label in POSITIVE_EMOTIONS:
    return "positive"
  if label in NEGATIVE_EMOTIONS:
    return "negative"
  return "neutral"


def _build_emotion_profile(all_tags: list[AnalysisTag]) -> EmotionProfile:
  """
  전체 일기 감정 태그 목록에서 positive/negative/neutral 비율 계산.

  알고리즘:
    1. EMOTION 타입 태그만 필터
    2. 각 태그 score를 버킷별로 합산
    3. 합계를 기준으로 비율 정규화 (합계 0인 경우 neutral=1.0)
  """
  emotion_tags = [t for t in all_tags if t.type == "EMOTION"]

  pos_sum = neg_sum = neu_sum = 0.0
  for tag in emotion_tags:
    bucket = _classify_emotion(tag.label)
    if bucket == "positive":
      pos_sum += tag.score
    elif bucket == "negative":
      neg_sum += tag.score
    else:
      neu_sum += tag.score

  total = pos_sum + neg_sum + neu_sum
  if total < 1e-9:
    # 감정 태그가 없는 경우 중립 100%
    return EmotionProfile(positive=0.0, negative=0.0, neutral=1.0)

  return EmotionProfile(
    positive=round(pos_sum / total, 4),
    negative=round(neg_sum / total, 4),
    neutral=round(neu_sum / total, 4),
  )


def _aggregate_lifestyle_tags(
  all_results: list[Any],
) -> tuple[list[str], list[AnalysisTag]]:
  """
  여러 일기 분석 결과에서 LIFESTYLE 태그를 집계해
  dominant_patterns(top 3~5)과 전체 keywords를 반환한다.

  집계 방식:
    - label 기준으로 score를 합산
    - 합산 score 내림차순 정렬 → top 3~5를 dominant_patterns로 선정
  """
  # label → score 합산
  lifestyle_scores: dict[str, float] = {}
  for result in all_results:
    for tag in result.tags:
      if tag.type == "LIFESTYLE":
        lifestyle_scores[tag.label] = lifestyle_scores.get(tag.label, 0.0) + tag.score

  # score 내림차순 정렬
  sorted_items = sorted(lifestyle_scores.items(), key=lambda x: x[1], reverse=True)

  # dominant_patterns: top DOMINANT_MAX 중 최소 DOMINANT_MIN 보장
  dominant_patterns = [label for label, _ in sorted_items[:_DOMINANT_MAX]]

  # keywords 목록 구성 (type=LIFESTYLE, 집계된 score로 재구성)
  keywords: list[AnalysisTag] = [
    AnalysisTag(type="LIFESTYLE", label=label, score=round(score, 4))
    for label, score in sorted_items
  ]

  return dominant_patterns, keywords


def _build_summary(dominant_patterns: list[str], diary_count: int) -> str:
  """
  라이프스타일 분석 결과 요약 문장 생성 (60자 이내).

  템플릿: "{N}편 일기 기반 {top_pattern} 성향이 두드러집니다."
  패턴이 없는 경우: "{N}편 일기를 분석했습니다."
  """
  if dominant_patterns:
    top = dominant_patterns[0]
    summary = f"{diary_count}편 일기 기반 {top} 성향이 두드러집니다."
  else:
    summary = f"{diary_count}편 일기를 분석했습니다."

  # 60자 초과 시 트림
  if len(summary) > _SUMMARY_MAX_CHARS:
    summary = summary[:_SUMMARY_MAX_CHARS]

  return summary


# ── 메인 분석 함수 ────────────────────────────────────────────────────────────

async def build_lifestyle_report(request: LifestyleAnalyzeRequest) -> LifestyleResult:
  """
  라이프스타일 분석 요청을 받아 LifestyleResult를 반환한다.

  Steps:
    1. 입력 검증 (일기 목록 비어 있으면 ValueError)
    2. 각 일기별 analyze_diary 병렬 호출 (asyncio.gather)
       - 개별 일기 분석 실패 시 해당 일기 결과 제외 (부분 실패 허용)
    3. lifestyle_tags 집계 → dominant_patterns + keywords
    4. emotion_tags 분류 → EmotionProfile
    5. summary 생성 → LifestyleResult 반환

  :param request: LifestyleAnalyzeRequest 요청 객체
  :return: LifestyleResult 분석 결과
  :raises ValueError: 일기 목록이 비어 있을 때
  :raises RuntimeError: 모든 일기 분석이 실패했을 때
  """
  if not request.diaries:
    raise ValueError("diaries 목록이 비어 있습니다.")

  # ── 2. 각 일기별 병렬 분석 ────────────────────────────────────────────────
  # 개별 실패를 허용하기 위해 return_exceptions=True 사용
  tasks = [
    kcelectra_service.analyze_diary(diary.content)
    for diary in request.diaries
  ]
  raw_results = await asyncio.gather(*tasks, return_exceptions=True)

  # 성공한 결과만 필터링
  valid_results = [r for r in raw_results if not isinstance(r, Exception)]

  if not valid_results:
    raise RuntimeError("모든 일기 분석이 실패했습니다. 개별 분석 결과 없음.")

  failed_count = len(raw_results) - len(valid_results)
  if failed_count > 0:
    import structlog
    logger = structlog.get_logger(__name__)
    logger.warning(
      "라이프스타일 분석 부분 실패",
      userId=request.userId,
      total=len(raw_results),
      failed=failed_count,
      succeeded=len(valid_results),
    )

  # ── 3. lifestyle_tags 집계 ─────────────────────────────────────────────────
  dominant_patterns, lifestyle_keywords = _aggregate_lifestyle_tags(valid_results)

  # ── 4. emotion_tags → EmotionProfile ──────────────────────────────────────
  # 전체 일기 분석 결과의 감정 태그를 플래튼하여 버킷 분류
  all_tags: list[AnalysisTag] = []
  for result in valid_results:
    all_tags.extend(result.tags)

  emotion_profile = _build_emotion_profile(all_tags)

  # ── 5. summary 생성 ────────────────────────────────────────────────────────
  summary = _build_summary(dominant_patterns, len(valid_results))

  return LifestyleResult(
    dominantPatterns=dominant_patterns,
    emotionProfile=emotion_profile,
    keywords=lifestyle_keywords,
    summary=summary,
  )
