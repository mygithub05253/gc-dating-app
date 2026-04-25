-- 약관 관리 (관리자 명세 v2.1 §10)
CREATE TABLE IF NOT EXISTS terms (
    id              BIGSERIAL    PRIMARY KEY,
    type            VARCHAR(20)  NOT NULL,                  -- USER_TERMS / AI_TERMS
    title           VARCHAR(200) NOT NULL,
    content         TEXT         NOT NULL,
    version         VARCHAR(20)  NOT NULL,
    status          VARCHAR(15)  NOT NULL DEFAULT 'DRAFT',  -- DRAFT / ACTIVE / ARCHIVED
    is_required     BOOLEAN      NOT NULL DEFAULT TRUE,
    effective_date  DATE,
    accept_count    INTEGER      NOT NULL DEFAULT 0,
    created_by      BIGINT,
    change_reason   VARCHAR(500),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 동일 유형의 ACTIVE 약관은 최대 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_type_active
    ON terms (type) WHERE status = 'ACTIVE';

-- 유형 + 상태 필터 조회
CREATE INDEX IF NOT EXISTS idx_terms_type_status
    ON terms (type, status);
