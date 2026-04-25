-- V21: 운영 자동화 테이블 (§20)

-- 자동 제재 규칙
CREATE TABLE IF NOT EXISTS auto_sanction_rules (
    id                BIGSERIAL    PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    description       VARCHAR(500),
    condition_json    TEXT         NOT NULL,
    action            VARCHAR(20)  NOT NULL CHECK (action IN ('SUSPEND_7D', 'SUSPEND_30D', 'BANNED')),
    enabled           BOOLEAN      NOT NULL DEFAULT FALSE,
    execution_count   INT          NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 자동 알림 규칙
CREATE TABLE IF NOT EXISTS auto_notification_rules (
    id                   BIGSERIAL    PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    description          VARCHAR(500),
    trigger_condition    TEXT         NOT NULL,
    notification_channel VARCHAR(20)  NOT NULL CHECK (notification_channel IN ('PUSH', 'EMAIL', 'IN_APP')),
    template_content     TEXT         NOT NULL,
    enabled              BOOLEAN      NOT NULL DEFAULT FALSE,
    last_triggered_at    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 리포트 내보내기 요청
CREATE TABLE IF NOT EXISTS report_exports (
    id            BIGSERIAL    PRIMARY KEY,
    report_type   VARCHAR(30)  NOT NULL CHECK (report_type IN ('USER_ANALYTICS', 'MATCHING_PERFORMANCE', 'OPERATIONS')),
    format        VARCHAR(10)  NOT NULL CHECK (format IN ('CSV', 'XLSX')),
    status        VARCHAR(20)  NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    download_url  VARCHAR(1000),
    file_size     BIGINT,
    expires_at    TIMESTAMPTZ,
    error_message TEXT,
    requested_by  BIGINT       REFERENCES admin_accounts(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_exports_status ON report_exports(status);
CREATE INDEX idx_report_exports_requested ON report_exports(requested_by);

-- 허위 신고 반복자 제한
CREATE TABLE IF NOT EXISTS user_report_restrictions (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    restricted_until TIMESTAMPTZ  NOT NULL,
    admin_id         BIGINT       REFERENCES admin_accounts(id) ON DELETE SET NULL,
    memo             VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_report_restrictions_user ON user_report_restrictions(user_id);

-- 시드: 기본 자동 제재 규칙
INSERT INTO auto_sanction_rules (name, description, condition_json, action, enabled) VALUES
    ('신고 3회 누적 경고',   '30일 내 3회 이상 유효 신고 접수 시', '{"reportCount": 3, "periodDays": 30}',  'SUSPEND_7D',  FALSE),
    ('신고 5회 누적 영구정지', '30일 내 5회 이상 유효 신고 접수 시', '{"reportCount": 5, "periodDays": 30}',  'BANNED',      FALSE)
ON CONFLICT DO NOTHING;
