-- =============================================================================
-- V8: reports 테이블에 우선순위·SLA·담당자 컬럼 + 인덱스 추가 (Phase A-3)
-- 작성일: 2026-04-23
-- 근거 문서:
--   - ERD 명세서 v2.1 §2.28 reports (v2.1 신규 3컬럼)
--   - 관리자 API 통합명세서 v2.1 §5.1~§5.7
--
-- 변경 내용:
--   - reports.priority_score INTEGER NOT NULL DEFAULT 0
--   - reports.sla_deadline TIMESTAMPTZ NULL
--   - reports.assigned_to BIGINT NULL (FK → admin_accounts.id)
--   - 인덱스: (status, priority_score DESC, sla_deadline ASC) — 우선순위 정렬
--   - 인덱스: (assigned_to, status) — 담당자별 미처리 신고 조회
--
-- 설계 기준 및 근거:
--   1. priority_score 는 관리자 대시보드 기본 정렬 키. 0~100 범위, DEFAULT 0
--      (기존 행의 초기값). 첫 조회 시에도 backfill 배치 없이 사용 가능하도록
--      애플리케이션에서 신규 삽입 시 산출값을 채운다.
--   2. sla_deadline 은 priority_score 에 연동해 생성 시점에 설정:
--      ≥80 → 24h, ≥50 → 72h, 그 외 → 7d. 초과 시 대시보드 경고 배지 (서버 계산).
--   3. assigned_to 는 resolved_by 와 별개 컬럼으로 유지(담당자 배정 ≠ 실제 처리자).
--      ON DELETE SET NULL 로 관리자 계정 삭제 대비.
--   4. 복합 인덱스 (status, priority_score DESC, sla_deadline ASC):
--      WHERE status = 'PENDING' ORDER BY priority_score DESC, sla_deadline ASC 패턴 최적화.
--   5. 복합 인덱스 (assigned_to, status): `assignedTo=me&status=PENDING` 필터 최적화.
--   6. 모든 추가는 Additive — 기존 데이터 무손실. 기존 행은 priority=0/sla=NULL/assigned=NULL 로 남음.
-- =============================================================================

ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS priority_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS assigned_to BIGINT;

-- FK 제약: admin_accounts 존재 시에만 추가 (멱등성 확보를 위해 존재 여부 확인)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_reports_assigned_to'
          AND table_name = 'reports'
    ) THEN
        ALTER TABLE reports
            ADD CONSTRAINT fk_reports_assigned_to
            FOREIGN KEY (assigned_to) REFERENCES admin_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- priority_score 범위 체크
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_reports_priority_score_range'
          AND table_name = 'reports'
    ) THEN
        ALTER TABLE reports
            ADD CONSTRAINT chk_reports_priority_score_range
            CHECK (priority_score BETWEEN 0 AND 100);
    END IF;
END $$;

-- 대시보드 정렬 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_status_priority_sla
    ON reports (status, priority_score DESC, sla_deadline ASC);

-- 담당자별 신고 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_assigned_status
    ON reports (assigned_to, status);
