"""
TF-IDF 기반 한국어 공통 키워드 추출 서비스

설계 원칙:
  - konlpy/mecab 없이 공백+구두점 기준 단순 토큰화 사용 (배포 환경 단순화)
  - scikit-learn TfidfVectorizer 활용 (requirements.txt 에 이미 포함)
  - 두 문서 모두에 등장하는 단어 중 TF-IDF 합 기준 상위 N개 반환

TODO(M7): konlpy/mecab 기반 형태소 분석으로 업그레이드해 명사 추출 품질 개선
"""
from __future__ import annotations

import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# ── 불용어 (stopwords) ────────────────────────────────────────────────────────
# 한국어 고빈도 기능어 / 접속사 / 대명사 중심으로 정의.
# 의미 있는 명사/형용사가 상위 키워드로 올라오도록 제거.
STOPWORDS: frozenset[str] = frozenset({
  # 접속사 / 부사
  "그리고", "하지만", "그런데", "그래서", "그러나", "그냥", "정말", "진짜", "너무",
  "그래도", "따라서", "또한", "그러므로", "왜냐하면", "만약", "비록", "아직", "이미",
  # 시간 표현
  "오늘", "어제", "내일", "지금", "매일", "항상", "요즘", "최근", "언제나",
  # 대명사
  "우리", "제가", "나는", "나의", "나를", "내가", "저는", "저의", "그것", "이것",
  "저것", "그가", "그녀가", "여기", "거기", "저기",
  # 형식 동사 / 조동사 어간 파편
  "되는", "있는", "있다", "없는", "없다", "했다", "하다", "같다", "한다", "된다",
  "이다", "아니다", "이런", "저런", "그런", "어떤", "모든", "다른", "같은", "이런",
  # 의존 명사 / 불완전 형태
  "것", "수", "때", "등", "중", "속", "일", "이", "번", "좀", "더", "잘",
  "못", "안", "다", "가", "도", "만", "을", "를", "이", "가", "은", "는",
  # 종결 어미 잔재 (공백 토큰화 후 남는 단글자)
  "고", "며", "서", "어", "아", "야", "나", "요", "죠", "지",
})


# ── 토크나이저 ─────────────────────────────────────────────────────────────────

_PUNCT_PATTERN = re.compile(r"[^\w가-힣a-zA-Z0-9]")


def simple_korean_tokenize(text: str) -> list[str]:
  """
  공백 + 구두점 기준 단순 한국어 토큰화.

  필터 조건:
    1. 구두점·특수문자 제거 후 길이 2글자 이상
    2. 한글 자모 최소 1자 포함 (순수 숫자·영문 단어 제외)
    3. 불용어(STOPWORDS) 제거

  반환: 토큰 문자열 목록
  konlpy 미사용 근거:
    - JVM 의존성으로 Docker 이미지 크기 약 500MB 증가
    - mecab 리눅스 so 파일 설치 절차 복잡 → CI/CD 구성 부담
    - 현 단계(MVP)에서는 공백 토큰화로 충분한 키워드 추출 품질 확보
    - M7 fine-tuning 단계에서 형태소 분석 도입 예정
  """
  tokens: list[str] = []
  for raw_token in text.split():
    # 구두점·특수문자 제거
    clean = _PUNCT_PATTERN.sub("", raw_token)
    # 2글자 이상, 한글 포함, 불용어 제외
    if (
      len(clean) >= 2
      and re.search(r"[가-힣]", clean)
      and clean not in STOPWORDS
    ):
      tokens.append(clean)
  return tokens


# ── 공통 키워드 추출 ──────────────────────────────────────────────────────────

def extract_common_keywords(texts: list[str], top_n: int = 7) -> list[str]:
  """
  두 텍스트 문서에서 TF-IDF 기반 공통 키워드를 추출한다.

  알고리즘:
    1. TfidfVectorizer(tokenizer=simple_korean_tokenize)로 두 문서 변환
    2. 두 문서 모두에 0이 아닌 TF-IDF 값을 가지는 단어를 공통 후보로 선정
    3. TF-IDF 합 내림차순으로 정렬해 상위 top_n개 반환

  :param texts: 길이 2인 텍스트 목록 [textA, textB]
  :param top_n: 반환할 최대 키워드 수 (기본 7)
  :return: 공통 키워드 문자열 목록 (최대 top_n개, 없으면 빈 리스트)
  """
  if len(texts) < 2:
    return []

  try:
    vectorizer = TfidfVectorizer(
      tokenizer=simple_korean_tokenize,
      token_pattern=None,  # 커스텀 tokenizer 사용 시 token_pattern=None 필수
      min_df=1,
      max_features=200,
      sublinear_tf=True,    # 빈도 로그 스케일링으로 고빈도 단어 편중 완화
    )
    # X: (2, vocab_size) sparse matrix
    X = vectorizer.fit_transform(texts[:2])
  except ValueError:
    # 유효 토큰이 없는 경우 (텍스트가 너무 짧거나 모두 불용어)
    return []

  feature_names: list[str] = vectorizer.get_feature_names_out().tolist()
  # dense 변환 — 어휘 크기가 max_features=200 으로 제한되어 메모리 안전
  scores = X.toarray()  # (2, vocab_size)

  common_keywords: list[tuple[str, float]] = []
  for i, term in enumerate(feature_names):
    score_a = scores[0, i]
    score_b = scores[1, i]
    # 양쪽 모두에 등장한 단어만 공통 키워드로 간주
    if score_a > 0 and score_b > 0:
      common_keywords.append((term, score_a + score_b))

  # TF-IDF 합 내림차순 정렬 후 상위 top_n 반환
  common_keywords.sort(key=lambda x: x[1], reverse=True)
  return [kw for kw, _ in common_keywords[:top_n]]
