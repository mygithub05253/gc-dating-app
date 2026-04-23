-- =============================================================================
-- V9: 콘텐츠 관리 테이블 신설 (Phase A-4)
-- 작성일: 2026-04-23
-- 근거 문서:
--   - ERD 명세서 v2.1 §2.10 weekly_topics, §2.39 example_diaries, §2.40 exchange_diary_guide_steps
--   - 관리자 API 통합명세서 v2.1 §6.4 ~ §6.7
--
-- 변경 내용:
--   - weekly_topics: IF NOT EXISTS 로 보강 (dev ddl-auto 환경 호환)
--   - example_diaries 테이블 신설
--   - exchange_diary_guide_steps 테이블 신설
--
-- 설계 기준 및 근거:
--   1. example_diaries.category 는 weekly_topics.category 와 동일한 6종 enum 집합
--      (GRATITUDE / GROWTH / DAILY / EMOTION / RELATIONSHIP / SEASONAL) — ERD v2.1 §2.39 확장.
--   2. display_target 3종 (ONBOARDING / HELP / FAQ): 스펙에 정의된 노출 대상 외에는 거부.
--   3. exchange_diary_guide_steps 는 단계 순서 UNIQUE 제약 — 중복 순서 방지.
--   4. 모든 is_active 컬럼 DEFAULT TRUE — 관리자가 비활성화해도 데이터는 보존.
-- =============================================================================

-- 2.10 weekly_topics — Hibernate ddl-auto 로 이미 생성되었을 가능성 있음. 멱등 처리.
CREATE TABLE IF NOT EXISTS weekly_topics (
    id               BIGSERIAL PRIMARY KEY,
    topic            VARCHAR(200) NOT NULL,
    week_start_date  DATE NOT NULL UNIQUE,
    category         VARCHAR(20) NOT NULL,
    usage_count      INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.39 example_diaries
CREATE TABLE IF NOT EXISTS example_diaries (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(100) NOT NULL,
    content          TEXT NOT NULL,
    category         VARCHAR(20) NOT NULL,
    display_target   VARCHAR(20) NOT NULL DEFAULT 'ONBOARDING',
    display_order    INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_by       BIGINT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_example_diaries_created_by'
    ) THEN
        ALTER TABLE example_diaries
            ADD CONSTRAINT fk_example_diaries_created_by
            FOREIGN KEY (created_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_example_diaries_target_active_order
    ON example_diaries (display_target, is_active, display_order);

-- 2.40 exchange_diary_guide_steps
CREATE TABLE IF NOT EXISTS exchange_diary_guide_steps (
    id               BIGSERIAL PRIMARY KEY,
    step_order       INTEGER NOT NULL UNIQUE,
    step_title       VARCHAR(100) NOT NULL,
    description      TEXT NOT NULL,
    image_url        VARCHAR(500),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
