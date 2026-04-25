-- 일괄 공지/푸시 캠페인 (명세 v2.3 §11.1.3)
-- 1) notification_campaign: 캠페인 메타 (대상 필터, 메시지 본문, 상태)
-- 2) notification_send_log: 사용자별 발송 이력 (성공/실패/열람/클릭)
--
-- Phase 2-A 범위: 캠페인 CRUD + 미리보기 + 승인/취소 + 결과 조회.
-- 실제 발송 워커(FCM 멀티캐스트, 이메일 어댑터, 재시도, 예약 스케줄러)는 Phase 2-B에서 구현.

-- ==========================================================
-- 1. notification_campaign
-- ==========================================================
CREATE TABLE IF NOT EXISTS notification_campaign (
    id                BIGSERIAL    PRIMARY KEY,
    title             VARCHAR(200) NOT NULL,                  -- 캠페인 제목 (관리자 식별용)
    message_subject   VARCHAR(500) NOT NULL,                  -- 발송 메시지 제목 (이메일 subject / 푸시 title)
    message_body      TEXT         NOT NULL,                  -- 발송 메시지 본문
    filter_conditions TEXT         NOT NULL,                  -- JSON: 가입일/마지막 접속일/매칭 여부/AI 동의 등
    send_types        VARCHAR(60)  NOT NULL,                  -- 콤마 구분: NOTICE,PUSH,EMAIL
    scheduled_at      TIMESTAMP,                              -- NULL=즉시, 값=KST 예약 시각
    status            VARCHAR(15)  NOT NULL DEFAULT 'DRAFT',  -- DRAFT/SCHEDULED/SENDING/COMPLETED/CANCELLED
    target_count      INTEGER      NOT NULL DEFAULT 0,        -- 미리보기 시점 대상 수 (스냅샷)
    success_count     INTEGER      NOT NULL DEFAULT 0,
    failure_count     INTEGER      NOT NULL DEFAULT 0,
    sent_at           TIMESTAMP,                              -- SENDING 시작 시각
    completed_at      TIMESTAMP,                              -- COMPLETED/CANCELLED 전이 시각
    created_by        BIGINT       NOT NULL,                  -- admin_accounts.id
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_campaign_created_by
        FOREIGN KEY (created_by) REFERENCES admin_accounts(id) ON DELETE RESTRICT
);

-- 목록 조회 — 상태별 최신순
CREATE INDEX IF NOT EXISTS idx_notification_campaign_status_created
    ON notification_campaign (status, created_at DESC);

-- 예약 스케줄러용 — SCHEDULED 상태에서 scheduled_at 도래 검색 (Phase 2-B)
CREATE INDEX IF NOT EXISTS idx_notification_campaign_scheduled_at
    ON notification_campaign (scheduled_at)
    WHERE status = 'SCHEDULED';

-- 생성자 필터링용
CREATE INDEX IF NOT EXISTS idx_notification_campaign_created_by
    ON notification_campaign (created_by, created_at DESC);

-- ==========================================================
-- 2. notification_send_log
-- ==========================================================
CREATE TABLE IF NOT EXISTS notification_send_log (
    id              BIGSERIAL    PRIMARY KEY,
    campaign_id     BIGINT       NOT NULL,
    user_id         BIGINT       NOT NULL,
    send_type       VARCHAR(10)  NOT NULL,                    -- NOTICE/PUSH/EMAIL
    status          VARCHAR(15)  NOT NULL,                    -- SUCCESS/FAILED
    failure_reason  VARCHAR(255),
    sent_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opened_at       TIMESTAMP,                                -- 앱 내 공지/이메일 열람 시각
    clicked_at      TIMESTAMP,                                -- 푸시 클릭 시각
    CONSTRAINT fk_notification_send_log_campaign
        FOREIGN KEY (campaign_id) REFERENCES notification_campaign(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_send_log_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- 동일 사용자에게 동일 캠페인을 동일 채널로 두 번 발송 방지 (명세 §11.1.3 Step 7 Data Integrity)
    CONSTRAINT uq_notification_send_log_campaign_user_type
        UNIQUE (campaign_id, user_id, send_type)
);

-- 결과 조회 — 캠페인별 상태 카운트 집계
CREATE INDEX IF NOT EXISTS idx_notification_send_log_campaign_status
    ON notification_send_log (campaign_id, status);

-- 사용자별 발송 이력 조회
CREATE INDEX IF NOT EXISTS idx_notification_send_log_user_sent
    ON notification_send_log (user_id, sent_at DESC);
