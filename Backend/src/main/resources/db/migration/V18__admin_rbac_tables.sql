-- V18: RBAC 권한 관리 테이블 (§14)

CREATE TABLE IF NOT EXISTS permissions (
    id              BIGSERIAL PRIMARY KEY,
    permission_key  VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id              BIGSERIAL PRIMARY KEY,
    role            VARCHAR(20)  NOT NULL,
    permission_id   BIGINT       NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role);

-- 시드 데이터: 기본 권한 목록
INSERT INTO permissions (permission_key, description) VALUES
    ('DASHBOARD_VIEW',       '대시보드 조회'),
    ('MEMBER_VIEW',          '회원 조회'),
    ('MEMBER_MANAGE',        '회원 관리 (제재/해제)'),
    ('REPORT_VIEW',          '신고 조회'),
    ('REPORT_MANAGE',        '���고 처리/기각'),
    ('CONTENT_VIEW',         '콘텐츠 조회'),
    ('CONTENT_MANAGE',       '콘텐츠 관리 (CRUD)'),
    ('ANALYTICS_VIEW',       '분석 대시보드 조회'),
    ('AI_VIEW',              'AI 모니터링 조회'),
    ('AI_MANAGE',            'AI 액션 (DLQ 재처리 등)'),
    ('ADMIN_ACCOUNT_VIEW',   '관리자 계정 조회'),
    ('ADMIN_ACCOUNT_MANAGE', '관리자 계정 관리'),
    ('RBAC_MANAGE',          'RBAC 권한 설정'),
    ('SYSTEM_MANAGE',        '시스템 설정 관리'),
    ('EXPORT_DATA',          '데이터 내보내기')
ON CONFLICT (permission_key) DO NOTHING;

-- SUPER_ADMIN: 모든 권한
INSERT INTO role_permissions (role, permission_id)
SELECT 'SUPER_ADMIN', id FROM permissions
ON CONFLICT DO NOTHING;

-- ADMIN: 조회 + 관리 (RBAC/시스템 제외)
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions
WHERE permission_key NOT IN ('RBAC_MANAGE', 'SYSTEM_MANAGE', 'ADMIN_ACCOUNT_MANAGE')
ON CONFLICT DO NOTHING;

-- VIEWER: 조회만
INSERT INTO role_permissions (role, permission_id)
SELECT 'VIEWER', id FROM permissions
WHERE permission_key LIKE '%_VIEW'
ON CONFLICT DO NOTHING;
