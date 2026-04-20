-- =============================================================================
-- V5: 라이프스타일 분석 파이프라인 + 사용자 벡터 배치 인프라 (M6 마일스톤)
-- 작성일: 2026-04-20
-- 변경 내용:
--   1. user_personality_keywords 테이블 정식 DDL 선언
--      (V1 베이스라인에서 Hibernate ddl-auto로 생성 → Flyway 관리 체계로 편입)
--   2. user_personality_keywords: 인덱스·제약 추가 (AI 매칭 성능 최적화)
--   3. lifestyle_analysis_log 테이블 신규 생성 (라이프스타일 분석 이력 추적)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. user_personality_keywords 테이블 정식 선언
--    Hibernate가 이미 생성했을 경우 CREATE TABLE IF NOT EXISTS로 안전하게 처리.
--    컬럼 추가 누락분은 ADD COLUMN IF NOT EXISTS로 보완.
--
--    설계 기준:
--      - (user_id, tag_type, label) 복합 UNIQUE: 동일 키워드 중복 INSERT 방지
--      - weight DECIMAL(6,4): 라이프스타일 분석 누적 점수 (0.0000 ~ 9.9999 범위 허용)
--      - analysis_status: INSUFFICIENT_DATA(5편 미만) | COMPLETED(분석 완료)
--      - analyzed_diary_count: 마지막 분석에 사용된 일기 편수 (품질 지표)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_personality_keywords (
    id                   BIGSERIAL        PRIMARY KEY,
    user_id              BIGINT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_type             VARCHAR(30)      NOT NULL,       -- EMOTION | LIFESTYLE | RELATIONSHIP_STYLE | TONE
    label                VARCHAR(50)      NOT NULL,       -- 예: "아침형", "활발함", "배려심"
    weight               DECIMAL(6, 4)   NOT NULL DEFAULT 0,
    analysis_status      VARCHAR(20)      NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    analyzed_diary_count INT              NOT NULL DEFAULT 0,
    last_analyzed_at     TIMESTAMP,
    created_at           TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- 중복 방지 UNIQUE 제약 (동일 사용자 + 태그유형 + 레이블 조합)
ALTER TABLE user_personality_keywords
    ADD CONSTRAINT IF NOT EXISTS uq_user_personality_keywords_user_type_label
        UNIQUE (user_id, tag_type, label);

-- tag_type 체크 제약
ALTER TABLE user_personality_keywords
    ADD CONSTRAINT IF NOT EXISTS chk_user_personality_keywords_tag_type
        CHECK (tag_type IN ('EMOTION', 'LIFESTYLE', 'RELATIONSHIP_STYLE', 'TONE'));

-- analysis_status 체크 제약
ALTER TABLE user_personality_keywords
    ADD CONSTRAINT IF NOT EXISTS chk_user_personality_keywords_analysis_status
        CHECK (analysis_status IN ('INSUFFICIENT_DATA', 'COMPLETED'));

-- weight 범위 체크 제약 (음수 방지)
ALTER TABLE user_personality_keywords
    ADD CONSTRAINT IF NOT EXISTS chk_user_personality_keywords_weight
        CHECK (weight >= 0);

-- 컬럼 추가 (Hibernate 생성 테이블에 누락된 경우 보완)
ALTER TABLE user_personality_keywords
    ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(20) NOT NULL DEFAULT 'INSUFFICIENT_DATA';

ALTER TABLE user_personality_keywords
    ADD COLUMN IF NOT EXISTS analyzed_diary_count INT NOT NULL DEFAULT 0;

ALTER TABLE user_personality_keywords
    ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP;

COMMENT ON TABLE user_personality_keywords IS
    'AI 라이프스타일 분석 결과 누적 퍼스널리티 키워드 — KcELECTRA 태그 기반 (M6)';
COMMENT ON COLUMN user_personality_keywords.weight IS
    '누적 분석 점수. 라이프스타일 재분석 시 기존 score에 새 score를 더해 누적.';
COMMENT ON COLUMN user_personality_keywords.analysis_status IS
    'INSUFFICIENT_DATA: 분석 일기 5편 미만 / COMPLETED: 정상 분석 완료';
COMMENT ON COLUMN user_personality_keywords.analyzed_diary_count IS
    '마지막 분석 시 사용된 일기 편수. 매칭 품질 지표로 활용.';


-- -----------------------------------------------------------------------------
-- 2. user_personality_keywords 성능 인덱스
--    - 매칭 시 candidateIds 배치 조회용 복합 인덱스
--    - 라이프스타일 분석 결과 upsert 시 (userId, tagType, label) 조회 최적화
-- -----------------------------------------------------------------------------

-- 후보 사용자 배치 조회 인덱스 (MatchingService.buildPersonalityKeywordMap)
CREATE INDEX IF NOT EXISTS idx_user_personality_keywords_user_id
    ON user_personality_keywords (user_id);

-- 태그 유형별 조회 인덱스 (AI 분석 통계용)
CREATE INDEX IF NOT EXISTS idx_user_personality_keywords_tag_type
    ON user_personality_keywords (tag_type);

-- 최근 분석 시각 인덱스 (오래된 퍼스널리티 재분석 스케줄링용)
CREATE INDEX IF NOT EXISTS idx_user_personality_keywords_last_analyzed_at
    ON user_personality_keywords (last_analyzed_at);


-- -----------------------------------------------------------------------------
-- 3. lifestyle_analysis_log 테이블 신규 생성
--    라이프스타일 분석 이력을 별도 로그 테이블로 관리.
--    LifestyleAnalysisResultHandler 완료 처리 시 기록.
--
--    설계 기준:
--      - user_activity_events와 분리: 라이프스타일 분석 전용 집계·이력 관리 목적
--      - dominant_patterns JSONB: 주요 패턴 목록을 배열로 저장 (조회 최적화)
--      - emotion_profile JSONB: positive/negative/neutral 비율 구조체
--      - summary TEXT: AI 생성 한국어 설명 (60자 이내)
--      - diary_count: 분석에 사용된 일기 편수 (최대 10편)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lifestyle_analysis_log (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analyzed_at         TIMESTAMP    NOT NULL DEFAULT NOW(),    -- 분석 완료 시각 (FastAPI 반환값)
    diary_count         INT          NOT NULL DEFAULT 0,        -- 분석에 사용된 일기 편수
    dominant_patterns   JSONB,                                  -- ["아침형", "야외활동", "사교적"]
    emotion_profile     JSONB,                                  -- {"positive": 0.6, "negative": 0.2, "neutral": 0.2}
    summary             TEXT,                                   -- AI 생성 라이프스타일 설명 (60자 이내)
    raw_result          JSONB,                                  -- FastAPI 원본 응답 전체 (감사·디버깅용)
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 사용자별 분석 이력 조회 인덱스 (최신 분석 결과 1건 조회용)
CREATE INDEX IF NOT EXISTS idx_lifestyle_analysis_log_user_id_analyzed_at
    ON lifestyle_analysis_log (user_id, analyzed_at DESC);

COMMENT ON TABLE lifestyle_analysis_log IS
    '라이프스타일 분석 이력 로그 — KcELECTRA 기반 분석 완료 시 누적 (M6)';
COMMENT ON COLUMN lifestyle_analysis_log.dominant_patterns IS
    '주요 라이프스타일 패턴 top 3~5 (JSONB 배열). 예: ["아침형", "야외활동"]';
COMMENT ON COLUMN lifestyle_analysis_log.emotion_profile IS
    '감정 비율 프로필 (positive+negative+neutral = 1.0)';
COMMENT ON COLUMN lifestyle_analysis_log.raw_result IS
    'FastAPI 원본 JSON 응답 전체. 감사·디버깅·재처리 시 활용.';
