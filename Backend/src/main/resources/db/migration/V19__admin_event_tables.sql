-- V19: 이벤트/프로모션 관리 테이블 (§15)

CREATE TABLE IF NOT EXISTS promotion_events (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(2000),
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('EVENT', 'PROMOTION', 'CAMPAIGN')),
    status      VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED')),
    target      VARCHAR(20)  NOT NULL DEFAULT 'ALL' CHECK (target IN ('ALL', 'NEW_USERS', 'PREMIUM', 'INACTIVE')),
    start_date  TIMESTAMPTZ  NOT NULL,
    end_date    TIMESTAMPTZ  NOT NULL,
    config      TEXT,
    created_by  BIGINT       REFERENCES admin_accounts(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotion_events_status ON promotion_events(status);
CREATE INDEX idx_promotion_events_dates ON promotion_events(start_date, end_date);

CREATE TABLE IF NOT EXISTS event_participants (
    id              BIGSERIAL   PRIMARY KEY,
    event_id        BIGINT      NOT NULL REFERENCES promotion_events(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL,
    participated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
