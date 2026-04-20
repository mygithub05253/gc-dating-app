-- =============================================================================
-- V3: 매칭 동기 파이프라인 + 추천 캐싱 인프라 (M4 마일스톤)
-- 작성일: 2026-04-20
-- 변경 내용:
--   1. user_vectors 테이블: 재정의 (기존 Hibernate 생성 스키마 → M4 스펙 반영)
--      - vectorData(TEXT) → embedding(BYTEA 768차원 fp16 = 1536바이트)
--      - dimension, source 컬럼 추가
--      - diaryCount 컬럼 제거 (last_updated_at으로 대체)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_vectors 테이블 M4 스펙으로 재정의
-- 기존 Hibernate 생성 테이블 구조(vectorData TEXT)를 BYTEA 기반으로 변경.
-- 기존 데이터가 없다면 DROP → CREATE, 있다면 컬럼 단위 마이그레이션.
-- 안전을 위해 IF EXISTS + ADD COLUMN IF NOT EXISTS 패턴 사용.
-- -----------------------------------------------------------------------------

-- 기존 id(BIGSERIAL), vector_data(TEXT), diary_count 컬럼 제거 후 재구성
-- 기존 테이블이 Hibernate에 의해 생성되어 있는 경우 처리
DO $$
BEGIN
    -- vector_data 컬럼 제거 (기존 스키마)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_vectors' AND column_name = 'vector_data'
    ) THEN
        ALTER TABLE user_vectors DROP COLUMN vector_data;
    END IF;

    -- diary_count 컬럼 제거 (기존 스키마)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_vectors' AND column_name = 'diary_count'
    ) THEN
        ALTER TABLE user_vectors DROP COLUMN diary_count;
    END IF;

    -- id(BIGSERIAL) 컬럼이 PK인 경우 → user_id를 PK로 전환 준비
    -- (Hibernate가 id PRIMARY KEY로 생성했을 경우 대비)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_vectors' AND column_name = 'id'
    ) THEN
        ALTER TABLE user_vectors DROP CONSTRAINT IF EXISTS user_vectors_pkey;
        ALTER TABLE user_vectors DROP COLUMN id;
    END IF;
END $$;

-- user_vectors 테이블 신규 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS user_vectors (
    user_id    BIGINT       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding  BYTEA        NOT NULL,            -- 768차원 fp16 = 1536 바이트
    dimension  INT          NOT NULL DEFAULT 768,
    source     VARCHAR(30)  NOT NULL,            -- DIARY | IDEAL_KEYWORDS | MIXED
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- embedding 컬럼 추가 (기존 테이블에 없는 경우)
ALTER TABLE user_vectors
    ADD COLUMN IF NOT EXISTS embedding  BYTEA       NOT NULL DEFAULT ''::bytea;

-- dimension 컬럼 추가
ALTER TABLE user_vectors
    ADD COLUMN IF NOT EXISTS dimension  INT         NOT NULL DEFAULT 768;

-- source 컬럼 추가
ALTER TABLE user_vectors
    ADD COLUMN IF NOT EXISTS source     VARCHAR(30) NOT NULL DEFAULT 'DIARY';

-- updated_at 컬럼 추가 (last_updated_at 컬럼 이름도 처리)
DO $$
BEGIN
    -- last_updated_at → updated_at 리네이밍 (기존 Hibernate 생성)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_vectors' AND column_name = 'last_updated_at'
    ) THEN
        ALTER TABLE user_vectors RENAME COLUMN last_updated_at TO updated_at;
    END IF;
END $$;

ALTER TABLE user_vectors
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP   NOT NULL DEFAULT NOW();

-- user_id PK 확인 및 기존 unique_constraint 처리
DO $$
BEGIN
    -- user_id unique constraint가 있고 PK가 아닌 경우 PK로 승격
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'user_vectors'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'user_id'
    ) THEN
        -- 기존 PK 제거
        ALTER TABLE user_vectors DROP CONSTRAINT IF EXISTS user_vectors_pkey;
        -- user_id를 PK로 설정
        ALTER TABLE user_vectors ADD PRIMARY KEY (user_id);
    END IF;
END $$;

-- source 체크 제약
ALTER TABLE user_vectors
    ADD CONSTRAINT IF NOT EXISTS chk_user_vectors_source
        CHECK (source IN ('DIARY', 'IDEAL_KEYWORDS', 'MIXED'));

-- 인덱스: 벡터 최신화 시간 기반 조회 (배치 lazy 생성 시 오래된 순 처리)
CREATE INDEX IF NOT EXISTS idx_user_vectors_updated_at
    ON user_vectors (updated_at);

COMMENT ON TABLE user_vectors IS
    'M4 매칭 파이프라인: 사용자 임베딩 벡터 (768차원 fp16 BYTEA)';
COMMENT ON COLUMN user_vectors.embedding IS
    '768차원 float16 벡터, 1536바이트. KoSimCSE 출력.';
COMMENT ON COLUMN user_vectors.source IS
    '임베딩 소스: DIARY(일기 기반) | IDEAL_KEYWORDS(이상형 키워드) | MIXED(혼합)';
COMMENT ON COLUMN user_vectors.dimension IS
    'KoSimCSE 기본 768. 모델 변경 시 추적용.';
