-- =============================================================================
-- V10: contact_detections 테이블 신설 (Phase A-3.5)
-- 작성일: 2026-04-23
-- 근거 문서:
--   - 관리자 API 통합명세서 v2.1 §5.10 / §5.11
--   - 프런트 `/admin/reports/contacts` Mock 형상 (Sidebar + page.tsx)
--
-- 변경 내용 (ERD 추가 후보 — v3.0 일괄 버전업 시 ERD 공식 반영):
--   - contact_detections 테이블 신설
--   - 인덱스: (status, detected_at DESC) / (user_id, status)
--
-- 설계 기준 및 근거:
--   1. pattern_type: PHONE / EMAIL / KAKAO / INSTAGRAM / LINK / OTHER (프런트 형상 + OTHER 확장)
--   2. content_type: DIARY / EXCHANGE_DIARY / CHAT_MESSAGE (신고 §5.6 context_type 과 동일 집합)
--   3. status: PENDING / CONFIRMED / FALSE_POSITIVE (프런트 형상)
--   4. action_type: HIDE_AND_WARN / ESCALATE_TO_REPORT / DISMISS (스펙 §5.11)
--      - HIDE_AND_WARN / ESCALATE → status=CONFIRMED, DISMISS → status=FALSE_POSITIVE
--   5. confidence: 0~100 INTEGER. AI 파이프라인 도입 시 모델 신뢰도 주입, 수동 입력은 100 고정.
--   6. detected_text 는 VARCHAR(300) — 전화번호/이메일/URL 은 일반적으로 300자 이내.
--   7. context 는 TEXT — 원문 맥락 일부 (앞뒤 30자 포함 수준).
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_detections (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    content_type    VARCHAR(20) NOT NULL,
    content_id      BIGINT,
    detected_text   VARCHAR(300) NOT NULL,
    pattern_type    VARCHAR(20) NOT NULL,
    context         TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    action_type     VARCHAR(30),
    confidence      INTEGER NOT NULL DEFAULT 0,
    admin_memo      TEXT,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contact_detections_user'
    ) THEN
        ALTER TABLE contact_detections
            ADD CONSTRAINT fk_contact_detections_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contact_detections_reviewed_by'
    ) THEN
        ALTER TABLE contact_detections
            ADD CONSTRAINT fk_contact_detections_reviewed_by
            FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 체크 제약
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_contact_detections_confidence'
    ) THEN
        ALTER TABLE contact_detections
            ADD CONSTRAINT chk_contact_detections_confidence
            CHECK (confidence BETWEEN 0 AND 100);
    END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contact_detections_status_detected
    ON contact_detections (status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_detections_user_status
    ON contact_detections (user_id, status);
