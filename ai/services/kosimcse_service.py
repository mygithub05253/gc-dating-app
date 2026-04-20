"""
KoSimCSE 기반 임베딩 서비스.

제공 기능:
  - embed(text)         : 단일 텍스트 → float16 bytes (1536 bytes for 768-dim)
  - cosine(a, b)        : bytes 두 개 → 코사인 유사도 (float)
  - embed_batch(texts)  : 텍스트 목록 → float16 bytes 목록
  - embed_to_base64(text): 단일 텍스트 → Base64 인코딩 float16 bytes

설계 원칙:
  - KoSimCSE의 mean pooling 사용 (BM-K/KoSimCSE-roberta 모델 공식 방식)
  - float16 직렬화 → BYTEA 저장 최적화 (768 * 2 = 1536 bytes)
  - CPU 추론 기준 동기 실행 (FastAPI async 환경에서는 run_in_executor 래핑 권장 — M5 TODO)
"""
from __future__ import annotations

import base64
from typing import Optional

import numpy as np
import structlog
import torch

from models import get_kosimcse

logger = structlog.get_logger(__name__)


# ── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _mean_pooling(model_output: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
    """
    KoSimCSE 공식 mean pooling.
    attention_mask를 고려해 padding 토큰을 제외한 평균 벡터를 반환한다.
    """
    token_embeddings = model_output[0]  # (batch, seq_len, hidden)
    input_mask_expanded = (
        attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    )
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    return sum_embeddings / sum_mask


def _normalize(vec: np.ndarray) -> np.ndarray:
    """L2 정규화. 코사인 유사도 계산을 내적으로 단순화하기 위해 사용."""
    norm = np.linalg.norm(vec)
    if norm < 1e-9:
        return vec
    return vec / norm


def _texts_to_embeddings(texts: list[str]) -> list[np.ndarray]:
    """
    텍스트 목록을 KoSimCSE mean pooling 임베딩 배열 목록으로 변환.
    반환: [(768,), (768,), ...] float32 ndarray 목록
    """
    tok, mdl = get_kosimcse()
    results: list[np.ndarray] = []

    for text in texts:
        encoded = tok(
            text,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        )
        with torch.no_grad():
            output = mdl(**encoded)

        # mean pooling → float32 → numpy
        pooled = _mean_pooling(output, encoded["attention_mask"])
        # fp16 모델에서 나온 결과를 float32로 변환
        vec = pooled.squeeze(0).float().numpy()
        results.append(vec)

    return results


def _vec_to_fp16_bytes(vec: np.ndarray) -> bytes:
    """float32 ndarray를 float16으로 변환 후 bytes로 직렬화 (1536 bytes for 768-dim)."""
    return vec.astype(np.float16).tobytes()


def _fp16_bytes_to_vec(data: bytes, dim: int = 768) -> np.ndarray:
    """float16 bytes를 float32 ndarray로 역직렬화."""
    return np.frombuffer(data, dtype=np.float16).astype(np.float32).reshape(dim)


# ── 공개 API ──────────────────────────────────────────────────────────────────

def embed(text: str) -> bytes:
    """
    단일 텍스트를 KoSimCSE로 임베딩해 float16 bytes 반환.
    BYTEA 저장용 (768차원 × 2bytes = 1536 bytes).

    :param text: 임베딩할 텍스트
    :return: float16 직렬화 bytes
    """
    vecs = _texts_to_embeddings([text])
    return _vec_to_fp16_bytes(vecs[0])


def embed_batch(texts: list[str]) -> list[bytes]:
    """
    텍스트 목록을 일괄 임베딩해 float16 bytes 목록 반환.

    :param texts: 임베딩할 텍스트 목록
    :return: 각 텍스트에 대응하는 float16 bytes 목록
    """
    vecs = _texts_to_embeddings(texts)
    return [_vec_to_fp16_bytes(v) for v in vecs]


def embed_to_base64(text: str) -> str:
    """
    단일 텍스트를 임베딩해 Base64 인코딩 문자열로 반환.
    Spring ↔ FastAPI JSON 전송용.

    :param text: 임베딩할 텍스트
    :return: Base64 인코딩 float16 bytes
    """
    return base64.b64encode(embed(text)).decode("ascii")


def embed_batch_to_base64(texts: list[str]) -> list[str]:
    """
    텍스트 목록을 일괄 임베딩해 Base64 인코딩 목록으로 반환.

    :param texts: 임베딩할 텍스트 목록
    :return: Base64 인코딩 float16 bytes 목록
    """
    raw_list = embed_batch(texts)
    return [base64.b64encode(b).decode("ascii") for b in raw_list]


def cosine(vec_a_bytes: bytes, vec_b_bytes: bytes, dim: int = 768) -> float:
    """
    두 float16 bytes 벡터 사이의 코사인 유사도를 계산한다.
    반환 범위: -1.0 ~ 1.0

    :param vec_a_bytes: 벡터 A (float16 직렬화)
    :param vec_b_bytes: 벡터 B (float16 직렬화)
    :param dim: 벡터 차원 (기본 768)
    :return: 코사인 유사도 (float)
    """
    a = _normalize(_fp16_bytes_to_vec(vec_a_bytes, dim))
    b = _normalize(_fp16_bytes_to_vec(vec_b_bytes, dim))
    # 내적 = 코사인 유사도 (정규화 완료)
    return float(np.dot(a, b))


def cosine_from_base64(base64_a: str, base64_b: str, dim: int = 768) -> float:
    """
    두 Base64 인코딩 float16 벡터 사이의 코사인 유사도를 계산한다.
    JSON으로 수신한 임베딩 비교 시 사용.

    :param base64_a: 벡터 A (Base64 인코딩 float16)
    :param base64_b: 벡터 B (Base64 인코딩 float16)
    :param dim: 벡터 차원 (기본 768)
    :return: 코사인 유사도 (float)
    """
    bytes_a = base64.b64decode(base64_a)
    bytes_b = base64.b64decode(base64_b)
    return cosine(bytes_a, bytes_b, dim)
