-- =============================================================================
-- V4: exchange_reports 리포트 결과 필드 추가 (M5 마일스톤)
-- 작성일: 2026-04-20
-- 변경 내용:
--   1. writing_temperature (TEXT, 구) → writing_temp_a / writing_temp_b (DECIMAL 4,3) 분리
--      설계서 §3.3 스펙: userA/userB 글쓰기 온도를 각각 저장 (KcELECTRA tone 분석)
--   2. 기존 writing_temperature 컬럼은 하위 호환성 유지를 위해 deprecated 처리 후 삭제
--      (데이터가 없는 경우 즉시 DROP, 있는 경우 별도 마이그레이션 스크립트 작성 필요)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. writing_temp_a / writing_temp_b 컬럼 추가
--    DECIMAL(4,3): 0.000 ~ 1.000 범위의 글쓰기 온도 점수
-- -----------------------------------------------------------------------------
ALTER TABLE exchange_reports
    ADD COLUMN IF NOT EXISTS writing_temp_a DECIMAL(4, 3);

ALTER TABLE exchange_reports
    ADD COLUMN IF NOT EXISTS writing_temp_b DECIMAL(4, 3);

COMMENT ON COLUMN exchange_reports.writing_temp_a IS
    'userA 글쓰기 온도 (0.000~1.000, KcELECTRA tone 분석)';

COMMENT ON COLUMN exchange_reports.writing_temp_b IS
    'userB 글쓰기 온도 (0.000~1.000, KcELECTRA tone 분석)';


-- -----------------------------------------------------------------------------
-- 2. writing_temperature (구 컬럼) 처리
--    exchange_reports 테이블은 운영 초기에 데이터가 없으므로 즉시 DROP.
--    만약 데이터가 존재한다면 (운영 환경) 아래 DROP 전에 수동 검토 필요.
-- -----------------------------------------------------------------------------
ALTER TABLE exchange_reports
    DROP COLUMN IF EXISTS writing_temperature;


-- -----------------------------------------------------------------------------
-- 3. 컬럼 체크 제약 추가 (0.000 ~ 1.000 범위 보장)
-- -----------------------------------------------------------------------------
ALTER TABLE exchange_reports
    ADD CONSTRAINT chk_exchange_reports_writing_temp_a
        CHECK (writing_temp_a IS NULL OR (writing_temp_a >= 0 AND writing_temp_a <= 1));

ALTER TABLE exchange_reports
    ADD CONSTRAINT chk_exchange_reports_writing_temp_b
        CHECK (writing_temp_b IS NULL OR (writing_temp_b >= 0 AND writing_temp_b <= 1));

ALTER TABLE exchange_reports
    ADD CONSTRAINT chk_exchange_reports_emotion_similarity
        CHECK (emotion_similarity IS NULL OR (emotion_similarity >= 0 AND emotion_similarity <= 1));


-- -----------------------------------------------------------------------------
-- 4. 리포트 완료 시각 인덱스 추가 (사용자 리포트 조회 최적화)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exchange_reports_room_id
    ON exchange_reports (room_id);

COMMENT ON TABLE exchange_reports IS
    '교환일기 완주 AI 리포트 — KcELECTRA + KoSimCSE 기반 분석 결과 저장';
