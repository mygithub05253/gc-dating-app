"""
교환일기 완주 리포트 AI 분석 서비스 (M5)

처리 파이프라인:
  1. 각 파티 일기 전체 텍스트 결합
  2. TF-IDF 공통 키워드 추출 (tfidf_service)
  3. KoSimCSE 감정 유사도 계산
  4. KcELECTRA lifestyle 태그 교집합 → 라이프스타일 패턴
  5. KcELECTRA tone 태그 → writing_temp 온도화
  6. 템플릿 기반 60자 이내 한국어 AI 설명 생성
"""
from __future__ import annotations

import asyncio
import logging

import numpy as np

from schemas.messages import ExchangeReportRequest, ExchangeResult
from services import kcelectra_service, kosimcse_service
from services.tfidf_service import extract_common_keywords

logger = logging.getLogger(__name__)

# ── 상수 ──────────────────────────────────────────────────────────────────────

# 글쓰기 온도 계산에 사용하는 '따뜻한' 톤 레이블
_WARM_TONE_LABELS: frozenset[str] = frozenset({
  "따뜻함", "감성적", "밝음", "유머러스",
})

# 글쓰기 온도 계산에 사용하는 '차가운' 톤 레이블 (M8 신규)
_COLD_TONE_LABELS: frozenset[str] = frozenset({
  "차분함", "어두움", "진지함", "신중함",
})

# 라이프스타일 패턴 최대 반환 수
_MAX_LIFESTYLE_PATTERNS: int = 5

# AI 설명 최대 길이 (바이트 아닌 글자 수)
_AI_DESCRIPTION_MAX_CHARS: int = 80


# ── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _join_diaries(payloads: list) -> str:
  """
  DiaryPayload 목록의 content 를 공백으로 결합해 단일 텍스트 반환.
  순서: diaryId 오름차순 (시간순 보장).
  """
  sorted_payloads = sorted(payloads, key=lambda p: p.diaryId)
  return " ".join(p.content for p in sorted_payloads)


def _compute_writing_temp(tone_tags: list) -> float:
  """
  KcELECTRA tone_tags 에서 따뜻한 톤과 차가운 톤 점수 차이로 글쓰기 온도 계산.

  v2 (M8) 양극 스케일:
    - warm_avg: _WARM_TONE_LABELS (따뜻함/감성적/밝음/유머러스) 점수 평균
    - cold_avg: _COLD_TONE_LABELS (차분함/어두움/진지함/신중함) 점수 평균
    - temp = clip(0.5 + 0.5 × (warm_avg - cold_avg), 0, 1)
      → 따뜻한 톤만 강하면 1.0 부근, 차가운 톤만 강하면 0.0 부근, 둘 다 없으면 0.5(중립)

  v1 한계: warm 평균만 사용해 차가운 톤이 강해도 점수에 반영되지 않음
           (예: 차분/어두움 0.9 + 따뜻함 0.0 → 0.0 — 온도가 '없음' 처리됨)
  v2 개선: 차가운 톤이 강한 경우도 0~0.5 범위에 매핑되어 양극 정보 보존

  TODO(M9): 감성 분석 전용 회귀 모델(fine-tuned)로 교체해 온도 계산 고도화
  """
  warm_scores: list[float] = [
    tag.score for tag in tone_tags if tag.label in _WARM_TONE_LABELS
  ]
  cold_scores: list[float] = [
    tag.score for tag in tone_tags if tag.label in _COLD_TONE_LABELS
  ]
  warm_avg = float(np.mean(warm_scores)) if warm_scores else 0.0
  cold_avg = float(np.mean(cold_scores)) if cold_scores else 0.0

  # 양극 차이를 0~1 로 매핑. 따뜻한 톤만 강하면 1.0, 차가운 톤만 강하면 0.0, 모두 없으면 0.5(중립)
  temp = 0.5 + 0.5 * (warm_avg - cold_avg)
  return round(min(max(temp, 0.0), 1.0), 4)


def _normalize_cosine(raw_cosine: float) -> float:
  """
  KoSimCSE 코사인 유사도(-1 ~ 1)를 0~1 범위로 정규화.
  음수 값은 유사도 없음(0.0)으로 처리.
  """
  return round(max(0.0, (raw_cosine + 1.0) / 2.0), 4)


def _compute_lifestyle_similarity(
  lifestyle_a: set[str],
  lifestyle_b: set[str],
) -> float:
  """
  두 라이프스타일 태그 집합의 Jaccard 유사도 (0~1).

  v2 (M8) 신규: 단순 set intersection 만으로는 "한쪽은 4개 / 한쪽은 2개" 같이
  교집합 크기가 같아도 합집합 대비 비율이 달라 패턴 매칭의 강도를 표현하지 못한다.
  Jaccard 유사도(|A ∩ B| / |A ∪ B|) 로 둘의 라이프스타일 합치도를 정량화한다.
  """
  if not lifestyle_a and not lifestyle_b:
    return 0.0
  union = lifestyle_a | lifestyle_b
  if not union:
    return 0.0
  return round(len(lifestyle_a & lifestyle_b) / len(union), 4)


def _build_ai_description(
  common_keywords: list[str],
  emotion_similarity: float,
  lifestyle_patterns: list[str],
  lifestyle_similarity: float,
) -> str:
  """
  공통 키워드 + 감정 유사도 + 라이프스타일 매칭을 결합한 한국어 AI 설명 생성 (M8 보강).

  v2 템플릿 선택 기준:
    - 공통 키워드 2개 이상 + 라이프스타일 패턴 1개 이상:
        "두 분은 X·Y 에 대한 관심이 겹치고, Z 성향까지 비슷합니다. 감정 표현 유사도 NN%."
    - 공통 키워드 1개 이상 + 라이프스타일 패턴 0개:
        "두 분은 X 에 대한 관심이 겹치고, 감정 표현 유사도는 NN%입니다."
    - 공통 키워드 0개 + 라이프스타일 패턴 1개 이상:
        "두 분은 X 성향이 비슷하고, 감정 표현 유사도는 NN%입니다."
    - 모두 0개:
        "두 분의 감정 표현 방식 유사도는 NN%로, 교환일기를 완주하셨습니다."

  최대 길이는 _AI_DESCRIPTION_MAX_CHARS (M8 기준 80자) 까지 확장.
  """
  similarity_pct = int(emotion_similarity * 100)
  has_keywords = len(common_keywords) > 0
  has_lifestyle = len(lifestyle_patterns) > 0

  if len(common_keywords) >= 2 and has_lifestyle:
    kw_str = f"'{common_keywords[0]}', '{common_keywords[1]}'"
    ls_str = f"'{lifestyle_patterns[0]}'"
    desc = (
      f"두 분은 {kw_str}에 대한 관심이 겹치고 {ls_str} 성향까지 비슷합니다. "
      f"감정 표현 유사도 {similarity_pct}%."
    )
  elif has_keywords and has_lifestyle:
    desc = (
      f"두 분은 '{common_keywords[0]}' 관심과 '{lifestyle_patterns[0]}' 성향이 겹치고, "
      f"감정 표현 유사도는 {similarity_pct}%입니다."
    )
  elif has_keywords:
    if len(common_keywords) >= 2:
      kw_str = f"'{common_keywords[0]}', '{common_keywords[1]}'"
    else:
      kw_str = f"'{common_keywords[0]}'"
    desc = f"두 분은 {kw_str}에 대한 관심이 겹치고, 감정 표현 유사도는 {similarity_pct}%입니다."
  elif has_lifestyle:
    desc = (
      f"두 분은 '{lifestyle_patterns[0]}' 성향이 비슷하고, "
      f"감정 표현 유사도는 {similarity_pct}%입니다."
    )
  else:
    desc = f"두 분의 감정 표현 방식 유사도는 {similarity_pct}%로, 교환일기를 완주하셨습니다."

  # 길이 초과 시 트림 (직전 공백에서 자르기)
  if len(desc) > _AI_DESCRIPTION_MAX_CHARS:
    cut = desc[:_AI_DESCRIPTION_MAX_CHARS]
    last_space = cut.rfind(" ")
    if last_space >= int(_AI_DESCRIPTION_MAX_CHARS * 0.6):
      desc = cut[:last_space]
    else:
      desc = cut

  return desc


# ── 메인 함수 ─────────────────────────────────────────────────────────────────

async def build_exchange_report(request: ExchangeReportRequest) -> ExchangeResult:
  """
  교환일기 완주 리포트를 위한 AI 분석을 수행하고 ExchangeResult 를 반환한다.

  Steps:
    1. 각 파티 일기를 결합해 textA / textB 생성
    2. TF-IDF 공통 키워드 추출 (동기 → run_in_executor)
    3. KoSimCSE 임베딩 + 코사인 유사도 계산 (동기 → run_in_executor)
    4. KcELECTRA analyze_diary 호출 (비동기) — 각 파티 첫 번째 일기 대표 사용
       (전체 concatenated text가 MIN_CONTENT_LENGTH 제한에 걸릴 수 있어 첫 일기 사용)
    5. lifestyle 태그 교집합 → lifestyle_patterns
    6. tone 태그 → writing_temp_a / writing_temp_b
    7. ai_description 생성 후 ExchangeResult 반환

  :raises ValueError: 일기 목록이 비어 있을 때
  :raises Exception: KcELECTRA / KoSimCSE 추론 실패 시 상위로 전파
  """
  # ── 1. 텍스트 결합 ────────────────────────────────────────────────────────
  if not request.diariesA or not request.diariesB:
    raise ValueError("diariesA 또는 diariesB 가 비어 있습니다.")

  textA = _join_diaries(request.diariesA)
  textB = _join_diaries(request.diariesB)

  logger.info(
    "교환일기 리포트 분석 시작 | reportId=%s roomId=%s textA_len=%d textB_len=%d",
    request.reportId,
    request.roomId,
    len(textA),
    len(textB),
  )

  # ── 2. TF-IDF 공통 키워드 (동기 CPU 작업 → executor 위임) ────────────────
  loop = asyncio.get_event_loop()
  common_keywords: list[str] = await loop.run_in_executor(
    None,
    extract_common_keywords,
    [textA, textB],
    7,  # top_n
  )
  logger.debug("공통 키워드 추출 완료 | keywords=%s", common_keywords)

  # ── 3. KoSimCSE 감정 유사도 ───────────────────────────────────────────────
  def _compute_cosine_similarity() -> float:
    """
    KoSimCSE embed(textA), embed(textB) → 코사인 유사도 (0~1 정규화).
    동기 함수이므로 run_in_executor 에서 실행.
    """
    bytes_a = kosimcse_service.embed(textA)
    bytes_b = kosimcse_service.embed(textB)
    raw = kosimcse_service.cosine(bytes_a, bytes_b)
    return _normalize_cosine(raw)

  emotion_similarity: float = await loop.run_in_executor(None, _compute_cosine_similarity)
  logger.debug("감정 유사도 계산 완료 | emotionSimilarity=%.4f", emotion_similarity)

  # ── 4. KcELECTRA 분석 (lifestyle + tone 태그 추출) ───────────────────────
  # 전략: 각 파티의 결합 텍스트를 분석. MIN_CONTENT_LENGTH(100자) 미달 시
  # ValueError 가 상위로 전파되어 FAILED 이벤트로 처리됨.
  # (교환일기는 통상 5회 이상 교환 → textA, textB 각각 500자 이상 예상)
  analysis_a, analysis_b = await asyncio.gather(
    kcelectra_service.analyze_diary(textA),
    kcelectra_service.analyze_diary(textB),
  )

  # ── 5. lifestyle 태그 교집합 → lifestyle_patterns + Jaccard 유사도 (M8) ──
  lifestyle_a: set[str] = {
    tag.label for tag in analysis_a.tags if tag.type == "LIFESTYLE"
  }
  lifestyle_b: set[str] = {
    tag.label for tag in analysis_b.tags if tag.type == "LIFESTYLE"
  }
  lifestyle_patterns: list[str] = sorted(lifestyle_a & lifestyle_b)[
    :_MAX_LIFESTYLE_PATTERNS
  ]
  lifestyle_similarity: float = _compute_lifestyle_similarity(lifestyle_a, lifestyle_b)
  logger.debug(
    "라이프스타일 패턴 교집합 | patterns=%s similarity=%.4f",
    lifestyle_patterns,
    lifestyle_similarity,
  )

  # ── 6. tone 태그 → writing_temp ───────────────────────────────────────────
  tone_tags_a = [tag for tag in analysis_a.tags if tag.type == "TONE"]
  tone_tags_b = [tag for tag in analysis_b.tags if tag.type == "TONE"]

  writing_temp_a = _compute_writing_temp(tone_tags_a)
  writing_temp_b = _compute_writing_temp(tone_tags_b)
  logger.debug(
    "글쓰기 온도 계산 완료 | tempA=%.4f tempB=%.4f",
    writing_temp_a,
    writing_temp_b,
  )

  # ── 7. AI 설명 생성 (M8: lifestyle 패턴 + 유사도까지 반영) ────────────────
  ai_description = _build_ai_description(
    common_keywords=common_keywords,
    emotion_similarity=emotion_similarity,
    lifestyle_patterns=lifestyle_patterns,
    lifestyle_similarity=lifestyle_similarity,
  )

  return ExchangeResult(
    commonKeywords=common_keywords,
    emotionSimilarity=emotion_similarity,
    lifestylePatterns=lifestyle_patterns,
    writingTempA=writing_temp_a,
    writingTempB=writing_temp_b,
    aiDescription=ai_description,
  )
