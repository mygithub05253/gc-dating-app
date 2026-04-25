-- 소셜 로그인 연동 이슈 관리 (명세 v2.3 §7.6)
-- 카카오 단독 OAuth 토큰/연동 오류를 시계열로 적재하여 관리자 모니터링 지원.
--
-- Phase 2-A 범위: 적재 + 통계/이력 조회.
-- 후속 작업: 일별 파티션 분리 + 90일 자동 아카이브는 운영 데이터 누적 후 별 PR로 분리.

CREATE TABLE IF NOT EXISTS social_login_error_log (
    id                  BIGSERIAL    PRIMARY KEY,
    provider            VARCHAR(20)  NOT NULL,                  -- KAKAO (단독, 향후 확장 가능)
    error_type          VARCHAR(40)  NOT NULL,                  -- TOKEN_EXPIRED/PROVIDER_SERVER_ERROR/USER_SOCIAL_ACCOUNT_DELETED/APP_PERMISSION_REVOKED
    error_code          VARCHAR(60),                            -- provider 원본 오류 코드 (예: KOE001)
    resolution_status   VARCHAR(40)  NOT NULL,                  -- AUTO_RECOVERED/USER_RELOGIN_REQUIRED/MANUAL_INTERVENTION_REQUIRED
    user_id             BIGINT,                                 -- 식별 가능한 경우만 (게스트 단계에서는 null 허용)
    request_ip          VARCHAR(45),                            -- IPv6 호환
    occurred_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 토큰 원본은 절대 저장하지 않는다 (명세 §7.6 Step 7 Security).
    -- 오류 메시지는 provider 측 메시지만 저장 (개인정보 미포함).
    error_message       VARCHAR(500),
    CONSTRAINT fk_social_login_error_log_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 통계 조회 — 제공자별 시간 윈도우 내 카운트 (가장 빈번)
CREATE INDEX IF NOT EXISTS idx_social_login_error_log_provider_occurred
    ON social_login_error_log (provider, occurred_at DESC);

-- 오류 유형 분포
CREATE INDEX IF NOT EXISTS idx_social_login_error_log_provider_type
    ON social_login_error_log (provider, error_type, occurred_at DESC);

-- 사용자별 반복 오류 (Edge Case 3)
CREATE INDEX IF NOT EXISTS idx_social_login_error_log_user_occurred
    ON social_login_error_log (user_id, occurred_at DESC)
    WHERE user_id IS NOT NULL;
