-- V20: 시스템 모니터링/설정 테이블 (§19)

-- 기능 플래그
CREATE TABLE IF NOT EXISTS feature_flags (
    id          BIGSERIAL    PRIMARY KEY,
    flag_key    VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    category    VARCHAR(20)  NOT NULL DEFAULT 'FEATURE' CHECK (category IN ('AI', 'UI', 'FEATURE', 'NOTIFICATION', 'SAFETY', 'PAYMENT')),
    enabled     BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_by  BIGINT       REFERENCES admin_accounts(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 기능 플래그 변경 이력
CREATE TABLE IF NOT EXISTS feature_flag_history (
    id             BIGSERIAL    PRIMARY KEY,
    flag_key       VARCHAR(100) NOT NULL,
    previous_value BOOLEAN      NOT NULL,
    new_value      BOOLEAN      NOT NULL,
    reason         VARCHAR(500),
    changed_by     BIGINT       REFERENCES admin_accounts(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feature_flag_history_key ON feature_flag_history(flag_key);

-- 배치 작업
CREATE TABLE IF NOT EXISTS batch_jobs (
    id                    BIGSERIAL    PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    description           VARCHAR(500),
    cron_expression       VARCHAR(50),
    status                VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'DISABLED')),
    last_execution_at     TIMESTAMPTZ,
    last_execution_result VARCHAR(20),
    next_execution_at     TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 배치 작업 실행 이력
CREATE TABLE IF NOT EXISTS batch_job_executions (
    id              BIGSERIAL   PRIMARY KEY,
    job_id          BIGINT      NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    result          VARCHAR(20) CHECK (result IN ('SUCCESS', 'FAILED', 'ABORTED')),
    processed_count INT         NOT NULL DEFAULT 0,
    error_message   TEXT,
    duration_ms     BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batch_job_executions_job ON batch_job_executions(job_id);

-- 시드: 기본 배치 작업 목록
INSERT INTO batch_jobs (name, description, cron_expression, status) VALUES
    ('AccountCleanup',     '30일 초과 탈퇴 유예 계정 영구 처리', '0 0 0 * * ?',    'ACTIVE'),
    ('ExchangeRoomExpiry', '교환일기 방 만료 처리',              '0 */10 * * * ?',  'ACTIVE'),
    ('CoupleReminder',     '커플 요청 리마인드 (24h/48h)',       '0 0 * * * ?',     'ACTIVE'),
    ('OutboxRelay',        'Outbox 이벤트 릴레이',              '0 */1 * * * ?',   'ACTIVE'),
    ('SlaOverdueAlert',    'SLA 초과 신고 알림',                '0 0 9 * * ?',     'ACTIVE')
ON CONFLICT DO NOTHING;

-- 시드: 기본 기능 플래그
INSERT INTO feature_flags (flag_key, description, category, enabled) VALUES
    ('AI_DIARY_ANALYSIS',     'AI 일기 분석 활성화',           'AI',           TRUE),
    ('AI_MATCHING_RECOMMEND', 'AI 매칭 추천 활성화',           'AI',           TRUE),
    ('AI_EXCHANGE_REPORT',    'AI 교환 리포트 생성',           'AI',           TRUE),
    ('CONTENT_SCAN',          '콘텐츠 금칙어 검열',            'SAFETY',       TRUE),
    ('CONTACT_DETECTION',     '외부 연락처 감지',              'SAFETY',       TRUE),
    ('FCM_PUSH',              'FCM 푸시 알림',                'NOTIFICATION', TRUE),
    ('DARK_MODE',             '다크모드 지원',                 'UI',           FALSE),
    ('COUPLE_REQUEST',        '커플 요청 기능',                'FEATURE',      TRUE)
ON CONFLICT (flag_key) DO NOTHING;
