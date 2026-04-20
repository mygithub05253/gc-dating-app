-- =============================================================================
-- V2: AI 파이프라인 인프라 스캐폴딩 (M1 마일스톤)
-- 작성일: 2026-04-20
-- 변경 내용:
--   1. diaries 테이블: analysis_status 컬럼 추가 (D-01)
--   2. exchange_reports 테이블: status Enum 정정 (D-02, PENDING → CONSENT_REQUIRED)
--   3. ai_consent_log 테이블: Enum 컬럼 타입 재정의 (D-03)
--   4. outbox_events 테이블 신규 생성
--   5. processed_messages 테이블 신규 생성
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. diaries: AI 분석 파이프라인 상태 컬럼 추가 (D-01)
-- 기존 status(DiaryStatus)는 사용자 워크플로우 상태 → 유지
-- analysis_status는 AI 분석 파이프라인 전용 상태
-- -----------------------------------------------------------------------------
ALTER TABLE diaries
    ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(15) NOT NULL DEFAULT 'PENDING';

COMMENT ON COLUMN diaries.analysis_status IS
    'AI 분석 파이프라인 상태: PENDING(대기) | PROCESSING(처리중) | COMPLETED(완료) | FAILED(실패) | SKIPPED(동의미획득/조건미충족)';


-- -----------------------------------------------------------------------------
-- 2. exchange_reports: ReportStatus Enum 정정 (D-02)
-- PENDING(구) → CONSENT_REQUIRED(신)로 의미 명확화
-- 기존 PENDING 행은 CONSENT_REQUIRED로 업데이트 후 컬럼 크기 확장
-- -----------------------------------------------------------------------------

-- 기존 PENDING 행을 CONSENT_REQUIRED로 업데이트
UPDATE exchange_reports
SET status = 'CONSENT_REQUIRED'
WHERE status = 'PENDING';

-- 컬럼 길이를 20으로 확장 (CONSENT_REQUIRED = 16자)
ALTER TABLE exchange_reports
    ALTER COLUMN status TYPE VARCHAR(20);

-- 체크 제약 추가 (허용 값 명시)
ALTER TABLE exchange_reports
    ADD CONSTRAINT chk_exchange_reports_status
        CHECK (status IN ('CONSENT_REQUIRED', 'PROCESSING', 'COMPLETED', 'FAILED'));

COMMENT ON COLUMN exchange_reports.status IS
    '리포트 생성 상태: CONSENT_REQUIRED(동의미획득, 기본값) | PROCESSING(생성중) | COMPLETED(완료) | FAILED(실패)';


-- -----------------------------------------------------------------------------
-- 3. ai_consent_log: 체크 제약으로 값 안전성 확보 (D-03, D-06)
-- 결정 4: main 기준 유지 — acted_at 컬럼, action/consentType String 필드.
--          feature의 agreed_at 컬럼 추가 제거.
-- ERD v1.2 기준: action = GRANTED/REVOKED, consent_type = AI_ANALYSIS/AI_DATA_USAGE
-- -----------------------------------------------------------------------------

-- 기존 action 값을 ERD v1.2 기준으로 정규화 (CONSENT→GRANTED, WITHDRAW→REVOKED)
UPDATE ai_consent_log SET action = 'GRANTED'  WHERE action IN ('CONSENT',  'GRANT',   'AGREE');
UPDATE ai_consent_log SET action = 'REVOKED'  WHERE action IN ('WITHDRAW', 'REVOKE',  'DISAGREE');

-- 체크 제약 추가
ALTER TABLE ai_consent_log
    ADD CONSTRAINT IF NOT EXISTS chk_ai_consent_log_action
        CHECK (action IN ('GRANTED', 'REVOKED'));

ALTER TABLE ai_consent_log
    ADD CONSTRAINT IF NOT EXISTS chk_ai_consent_log_consent_type
        CHECK (consent_type IN ('AI_ANALYSIS', 'AI_DATA_USAGE'));

-- 최신 동의 상태 조회 최적화 인덱스 (OutboxRelay에서 동의 확인 시 사용, acted_at 기준)
CREATE INDEX IF NOT EXISTS idx_ai_consent_log_user_type_at
    ON ai_consent_log (user_id, consent_type, acted_at DESC);


-- -----------------------------------------------------------------------------
-- 4. outbox_events 테이블 신규 생성
-- 트랜잭션 내 DB 쓰기와 메시지 발행을 원자적으로 처리하는 Outbox 패턴
-- OutboxRelay가 500ms 간격으로 PENDING 이벤트를 RabbitMQ로 릴레이
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_events (
    id             BIGSERIAL    PRIMARY KEY,
    aggregate_type VARCHAR(50)  NOT NULL,                          -- 도메인 (예: 'DIARY')
    aggregate_id   BIGINT       NOT NULL,                          -- 도메인 엔티티 PK
    event_type     VARCHAR(80)  NOT NULL,                          -- 이벤트 종류 (예: 'DIARY_ANALYZE_REQUESTED')
    payload        TEXT         NOT NULL,                          -- 메시지 본문 (JSON)
    headers        TEXT,                                           -- 트레이싱 헤더 (JSON, traceparent 등)
    status         VARCHAR(15)  NOT NULL DEFAULT 'PENDING',        -- PENDING | PROCESSED | FAILED
    retry_count    INT          NOT NULL DEFAULT 0,                -- 발행 재시도 횟수 (5회 초과 시 FAILED)
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMP
);

-- Relay 폴링용 복합 인덱스: PENDING 상태를 생성 순서대로 조회
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created_at
    ON outbox_events (status, created_at);

COMMENT ON TABLE outbox_events IS 'Transactional Outbox 패턴 — Spring OutboxRelay가 RabbitMQ로 릴레이';
COMMENT ON COLUMN outbox_events.retry_count IS '최대 5회 초과 시 status=FAILED로 전환';

-- 상태 체크 제약
ALTER TABLE outbox_events
    ADD CONSTRAINT chk_outbox_events_status
        CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED'));


-- -----------------------------------------------------------------------------
-- 5. processed_messages 테이블 신규 생성
-- Consumer 측 멱등성 보장: 메시지 처리 전 INSERT 시도 → PK 충돌로 중복 차단
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_messages (
    message_id     VARCHAR(36)  PRIMARY KEY,    -- RabbitMQ messageId (UUID)
    consumer_name  VARCHAR(100) NOT NULL,        -- Consumer 식별자 (예: 'AiResultConsumer')
    processed_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE processed_messages IS 'Consumer 멱등성 보장 — PK 충돌로 중복 처리 차단';
