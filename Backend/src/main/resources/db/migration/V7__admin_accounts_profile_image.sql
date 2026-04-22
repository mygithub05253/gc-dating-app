-- =============================================================================
-- V7: admin_accounts 에 profile_image_url 컬럼 추가 (Phase 3B CN-B3)
-- 작성일: 2026-04-22
--
-- 변경 내용:
--   - admin_accounts.profile_image_url VARCHAR(500) NULL 추가
--   - 관리자 '내 계정' 통합 페이지(AUTH-11)에서 프로필 이미지 URL 표시/수정 지원
--
-- 설계 기준 및 근거:
--   1. VARCHAR(500): 외부 CDN URL 길이 여유 확보 (S3 presigned URL 수준)
--   2. NULL 허용: 기존 계정 호환성 + 이미지 미설정도 유효한 상태
--   3. UNIQUE/인덱스 없음: 조회 조건이 아니고 단순 표시용
--   4. 외부 URL 화이트리스트 검증은 서비스 레이어에서 수행 (D8)
-- =============================================================================

ALTER TABLE admin_accounts
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
