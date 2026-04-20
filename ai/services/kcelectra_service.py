"""
KcELECTRA 기반 일기 분석 서비스 (v1 — zero-shot classification via embedding similarity)

전략:
  - 사전 정의된 앵커 레이블을 최초 호출 시 임베딩하고 lru_cache 에 보관
  - 입력 문서 임베딩 vs 각 앵커 임베딩 코사인 유사도 → top-3 추출
  - 임계값(0.35) 이상만 결과에 포함

TODO(M7): fine-tuning된 KcELECTRA-classifier 로 교체 시 이 모듈을 인터페이스로 교체
TODO(M7): summary 추출을 Extractive Summarization (KoBigBird 등)으로 업그레이드
TODO(품질): 앵커 임베딩 품질 평가 — 각 레이블의 분리도(silhouette score) 측정
"""
from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

import numpy as np
import torch

from config import KCELECTRA_MAX_LENGTH, MIN_CONTENT_LENGTH
from models import get_kcelectra
from schemas.messages import AnalysisResult, AnalysisTag

# ── 사전 정의 태그 앵커 레이블 ─────────────────────────────────────────────────

EMOTION_LABELS: list[str] = [
  "기쁨", "슬픔", "분노", "불안", "평온", "설렘", "외로움", "감사", "피로", "희망",
  "실망", "사랑", "그리움", "두려움", "안도", "자부심", "수치심", "놀람", "지루함",
  "편안함", "활력", "후회", "기대", "만족", "공허함",
]  # 25개

LIFESTYLE_LABELS: list[str] = [
  "아침형", "저녁형", "실내활동", "야외활동", "혼자 시간", "사교적",
  "정적", "활동적", "계획적", "즉흥적", "미식", "절제",
]  # 12개 6쌍

RELATIONSHIP_STYLE_LABELS: list[str] = [
  "배려심", "독립적", "친밀함", "거리감", "감정 표현", "논리 중시",
  "안정 추구", "모험 추구", "헌신적", "자유로움", "깊은 대화", "가벼운 대화",
  "공감 우선", "해결 우선", "신뢰 중시", "자율 중시", "함께하기", "개인 공간",
  "로맨틱", "실용적",
]  # 20개 10쌍

TONE_LABELS: list[str] = [
  "따뜻함", "차분함", "유머러스", "진지함", "감성적", "논리적",
  "밝음", "어두움", "솔직함", "신중함",
]  # 10개

CATEGORY_LABELS: list[str] = ["DAILY", "TRAVEL", "FOOD", "RELATIONSHIP", "WORK"]

# top-k 및 임계값 상수
_TOP_K: int = 3
_SCORE_THRESHOLD: float = 0.35


# ── 임베딩 유틸 ───────────────────────────────────────────────────────────────

def _embed_texts(texts: list[str]) -> np.ndarray:
  """
  텍스트 리스트를 KcELECTRA [CLS] 토큰 임베딩 배열로 변환.
  반환 shape: (len(texts), hidden_dim)
  """
  tok, mdl = get_kcelectra()
  all_embeddings: list[np.ndarray] = []

  for text in texts:
    inputs = tok(
      text,
      return_tensors="pt",
      truncation=True,
      max_length=KCELECTRA_MAX_LENGTH,
      padding=False,
    )
    with torch.no_grad():
      # [CLS] 토큰 (index 0) 벡터를 문서 표현으로 사용
      cls_vec = mdl(**inputs).last_hidden_state[:, 0, :]  # (1, hidden)
      # fp16 → float32 변환 후 numpy
      all_embeddings.append(cls_vec.squeeze(0).float().numpy())

  return np.array(all_embeddings)  # (N, hidden_dim)


def _cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
  """
  a: (1, d), b: (N, d)
  반환: (N,) 각 b 행과 a 사이의 코사인 유사도
  """
  a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)
  b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-9)
  # (1, d) @ (d, N) → (1, N) → (N,)
  return (a_norm @ b_norm.T).flatten()


# ── 앵커 임베딩 lru_cache (모델 로드 직후 warm-up 호출로 선점) ───────────────

@lru_cache(maxsize=1)
def _get_anchor_embeddings() -> dict[str, np.ndarray]:
  """
  태그 종류별 앵커 임베딩을 최초 1회만 계산하고 캐시.
  반환: {"EMOTION": ndarray(25, d), "LIFESTYLE": ..., ...}
  """
  return {
    "EMOTION": _embed_texts(EMOTION_LABELS),
    "LIFESTYLE": _embed_texts(LIFESTYLE_LABELS),
    "RELATIONSHIP_STYLE": _embed_texts(RELATIONSHIP_STYLE_LABELS),
    "TONE": _embed_texts(TONE_LABELS),
    "CATEGORY": _embed_texts(CATEGORY_LABELS),
  }


def warmup_anchors() -> None:
  """앱 lifespan 에서 호출해 앵커 임베딩을 미리 계산."""
  _get_anchor_embeddings()


# ── summary 추출 (초기 간단 구현) ────────────────────────────────────────────

_SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?。])\s+")


def _extract_summary(content: str, max_chars: int = 50) -> str:
  """
  본문 첫 1~2문장에서 50자 이내 요약 추출.
  TODO(M7): KoBigBird Extractive Summarization 으로 교체
  """
  # 문장 분리 (마침표/느낌표/물음표 기준)
  sentences = _SENTENCE_SPLIT_PATTERN.split(content.strip())
  first = sentences[0].strip() if sentences else content.strip()
  # 50자 초과 시 자르기
  if len(first) > max_chars:
    return first[:max_chars]
  return first


# ── top-k 태그 선택 ──────────────────────────────────────────────────────────

def _select_top_tags(
  doc_vec: np.ndarray,
  anchor_embeddings: np.ndarray,
  labels: list[str],
  tag_type: str,
  top_k: int = _TOP_K,
  threshold: float = _SCORE_THRESHOLD,
) -> list[AnalysisTag]:
  """
  코사인 유사도 기준 top-k 태그 추출 후 threshold 필터링.
  최소 1개는 항상 반환 (threshold 미통과여도 최고 점수 1개 보장).
  """
  scores: np.ndarray = _cosine_similarity_matrix(
    doc_vec.reshape(1, -1), anchor_embeddings
  )
  # top_k 인덱스 (내림차순)
  top_indices = np.argsort(scores)[::-1][:top_k]

  tags: list[AnalysisTag] = []
  for idx in top_indices:
    score = float(scores[idx])
    if score >= threshold or not tags:  # threshold 미달 시 첫 번째(최고 점수)는 보장
      tags.append(
        AnalysisTag(
          type=tag_type,  # type: ignore[arg-type]
          label=labels[int(idx)],
          score=round(score, 4),
        )
      )
  return tags


# ── 메인 분석 함수 ────────────────────────────────────────────────────────────

async def analyze_diary(content: str) -> AnalysisResult:
  """
  일기 본문을 받아 6종 태그 + summary + category 를 추출해 반환.

  Steps:
    1. 본문 길이 < MIN_CONTENT_LENGTH 이면 ValueError
    2. KcELECTRA 토크나이저로 max_length=512 truncate (경고 로그)
    3. [CLS] 토큰 기반 문서 임베딩 계산
    4. summary: 첫 문장 50자 이내 (초기 구현)
    5. category: CATEGORY_LABELS 앵커와 코사인 → argmax
    6. emotion / lifestyle / relationship_style / tone 각각 top-3 (score >= 0.35)
    7. AnalysisResult 반환
  """
  # ── 1. 길이 검증 ──────────────────────────────────────────────────────────
  if len(content) < MIN_CONTENT_LENGTH:
    raise ValueError(
      f"일기 본문이 최소 글자 수({MIN_CONTENT_LENGTH}자)에 미달합니다. "
      f"현재 길이: {len(content)}자"
    )

  # ── 3. 문서 임베딩 계산 (단일 텍스트) ──────────────────────────────────────
  # _embed_texts 내부에서 max_length=512 truncate 처리
  doc_vec: np.ndarray = _embed_texts([content])[0]  # (hidden_dim,)

  # ── 앵커 임베딩 취득 (lru_cache 히트) ─────────────────────────────────────
  anchors = _get_anchor_embeddings()

  # ── 4. summary 추출 ───────────────────────────────────────────────────────
  summary = _extract_summary(content)

  # ── 5. category 결정 (argmax) ─────────────────────────────────────────────
  cat_scores = _cosine_similarity_matrix(
    doc_vec.reshape(1, -1), anchors["CATEGORY"]
  )
  category_idx = int(np.argmax(cat_scores))
  category = CATEGORY_LABELS[category_idx]

  # ── 6. 4종 태그 추출 ──────────────────────────────────────────────────────
  emotion_tags = _select_top_tags(
    doc_vec, anchors["EMOTION"], EMOTION_LABELS, "EMOTION"
  )
  lifestyle_tags = _select_top_tags(
    doc_vec, anchors["LIFESTYLE"], LIFESTYLE_LABELS, "LIFESTYLE"
  )
  relationship_style_tags = _select_top_tags(
    doc_vec,
    anchors["RELATIONSHIP_STYLE"],
    RELATIONSHIP_STYLE_LABELS,
    "RELATIONSHIP_STYLE",
  )
  tone_tags = _select_top_tags(
    doc_vec, anchors["TONE"], TONE_LABELS, "TONE"
  )

  all_tags = emotion_tags + lifestyle_tags + relationship_style_tags + tone_tags

  # ── 7. 결과 반환 ──────────────────────────────────────────────────────────
  return AnalysisResult(
    summary=summary,
    category=category,  # type: ignore[arg-type]
    tags=all_tags,
  )
