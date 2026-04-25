-- 관리자 알림 센터 테이블 3종 (명세서 v2.3 §11.2)
-- 1) admin_notification: 알림 본체
-- 2) admin_notification_send_log: 채널 발송 이력
-- 3) admin_notification_subscription: 관리자별 구독 설정

-- ==========================================================
-- 1. admin_notification
-- ==========================================================
CREATE TABLE IF NOT EXISTS admin_notification (
    id              BIGSERIAL PRIMARY KEY,
    notification_type VARCHAR(15) NOT NULL,    -- CRITICAL/WARN/INFO
    category        VARCHAR(40)  NOT NULL,     -- AI_MONITORING/PIPELINE/REPORT_SLA/BATCH_FAILURE/MANUAL 등
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    source_type     VARCHAR(60)  NOT NULL,     -- 발생 출처 분류 키 (예: AI_ACCURACY_BATCH)
    source_id       VARCHAR(64),               -- 출처 레코드 ID (varchar로 일반화)
    action_url      VARCHAR(500),              -- 클릭 시 이동할 관리자 화면 URL
    status          VARCHAR(15)  NOT NULL DEFAULT 'UNREAD', -- UNREAD/READ/RESOLVED
    assigned_to     BIGINT,                    -- admin_accounts.id (null=미할당)
    resolved_by     BIGINT,                    -- admin_accounts.id
    resolved_at     TIMESTAMP,
    extra_payload   TEXT,                      -- JSON 직렬화 추가 페이로드 (옵셔널)
    grouped_count   INTEGER      NOT NULL DEFAULT 1, -- 5분 묶음 처리 시 누적 건수
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_notification_assigned_to FOREIGN KEY (assigned_to) REFERENCES admin_accounts(id) ON DELETE SET NULL,
    CONSTRAINT fk_admin_notification_resolved_by FOREIGN KEY (resolved_by) REFERENCES admin_accounts(id) ON DELETE SET NULL
);

-- 명세서 §11.2 비기능 요구: assigned_to/status/created_at 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_notification_assigned_status_created
    ON admin_notification (assigned_to, status, created_at DESC);

-- 카테고리/유형/생성시각 필터링용 보조 인덱스
CREATE INDEX IF NOT EXISTS idx_admin_notification_type_category_created
    ON admin_notification (notification_type, category, created_at DESC);

-- 5분 묶음 처리 (Edge Case 2) 조회용
CREATE INDEX IF NOT EXISTS idx_admin_notification_source_type_created
    ON admin_notification (source_type, created_at DESC);

-- ==========================================================
-- 2. admin_notification_send_log
-- ==========================================================
CREATE TABLE IF NOT EXISTS admin_notification_send_log (
    id              BIGSERIAL PRIMARY KEY,
    notification_id BIGINT       NOT NULL,
    admin_id        BIGINT       NOT NULL,
    channel         VARCHAR(15)  NOT NULL,     -- EMAIL/SLACK/IN_APP
    status          VARCHAR(15)  NOT NULL,     -- SUCCESS/FAILED
    error_message   VARCHAR(500),
    retry_count     INTEGER      NOT NULL DEFAULT 0,
    sent_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_notification_send_log_notification FOREIGN KEY (notification_id) REFERENCES admin_notification(id) ON DELETE CASCADE,
    CONSTRAINT fk_admin_notification_send_log_admin FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_send_log_notification
    ON admin_notification_send_log (notification_id);

CREATE INDEX IF NOT EXISTS idx_admin_notification_send_log_admin_sent
    ON admin_notification_send_log (admin_id, sent_at DESC);

-- ==========================================================
-- 3. admin_notification_subscription
-- ==========================================================
CREATE TABLE IF NOT EXISTS admin_notification_subscription (
    id              BIGSERIAL PRIMARY KEY,
    admin_id        BIGINT       NOT NULL,
    category        VARCHAR(40)  NOT NULL,     -- 구독할 카테고리 (전체 구독은 'ALL')
    alert_level     VARCHAR(15)  NOT NULL,     -- CRITICAL/WARN/INFO (이상 수신)
    channels        VARCHAR(100) NOT NULL,     -- 콤마 구분 (EMAIL,SLACK,IN_APP)
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_notification_subscription_admin FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE,
    CONSTRAINT uq_admin_notification_subscription_admin_category UNIQUE (admin_id, category)
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_subscription_admin
    ON admin_notification_subscription (admin_id);
