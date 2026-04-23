# Backend 팀 산출물 업로드 폴더

Ember 백엔드 (Spring Boot 3.x + PostgreSQL/Supabase + FastAPI AI 서버 연계).

## 자동 필터링 매핑 (Phase A-6 정합 확인)

진도표의 **"키워드 기반 자동 필터링"** 은 아래 구성으로 이미 구현되어 있음.
별도의 자동 필터링 모듈을 신설하지 않고 기존 자산을 재사용한다.

| 필터링 요소 | 구현 위치 | 관리자 API |
|---|---|---|
| 금칙어(BannedWord) 단어 매칭 | `com.ember.ember.content.service.BannedWordCacheService` + `ContentScanService` (로컬 Set + Redis 캐시, DB fallback) | `BannedWordAdminController` (CRUD) |
| URL 화이트리스트(UrlWhitelist) 검사 | `com.ember.ember.content.service.UrlWhitelistCacheService` + `ContentScanService` (정규식 URL 추출 + 화이트리스트 대조) | `UrlWhitelistAdminController` (CRUD) |
| FastAPI 원격 검열 (AI) | `content/client/ContentScanClient` → `/api/content/scan` (3초 타임아웃, Silent Fail 시 로컬 검사만으로 판단) | 상태 조회는 `AI 운영 관리 API` |
| 외부 연락처 감지(contact_detections) | `report/domain/ContactDetection` (Phase A-3.5 신설) | `AdminContactDetectionController` (§5.10~5.11) |
| 캐시 무효화 이벤트 | `BannedWordChangedEvent` / `UrlWhitelistChangedEvent` + `ModerationCacheEvictionListener` (TransactionalEventListener) | 관리자 CRUD 시 자동 발행 |

### 검열 플로우 요약
1. 일기/교환일기/채팅 메시지 제출
2. `ContentScanService.scan(text)` 호출
3. FastAPI 원격 검열(3s 타임아웃) → 정상이면 결과 기반 판단
4. 타임아웃/오류 → **Silent Fail** (WARN 로그), 로컬 검사만으로 판단 (무조건 허용 아님)
5. 로컬: 금칙어 Set 매칭 + URL 추출 후 화이트리스트 대조
6. 차단 사유는 `ContentScanResult.BlockedReason` (BANNED_WORD / URL_NOT_WHITELISTED / AI_POLICY)

### 관리자 캐시 관리
- Redis 키: `BANNED_WORDS:ALL`, `URL_WHITELIST`
- TTL: 1시간. CRUD 시 TransactionalEventListener 가 즉시 무효화.
- 캐시 miss → DB fallback (`BannedWordRepository`, `UrlWhitelistRepository`).

---

## Phase A 진척 (2026-04-23 KST)

| 단계 | 브랜치 | PR | 상태 |
|---|---|---|---|
| A-1 관리자 계정·활동 로그 | feature/backend-admin-accounts-v0.5 | 이전 머지 완료 | ✅ |
| A-2 회원 관리 | feature/backend-user-management-v0.5 | 이전 머지 완료 | ✅ |
| A-3 신고·차단 파이프라인 (우선순위/SLA/패턴) | feature/backend-report-pipeline-v0.5 | [#60](https://github.com/gc-code1piece/main/pull/60) | ✅ |
| A-4 콘텐츠 관리 (주제/예제/가이드/흐름) | feature/backend-content-admin-v0.5 | [#61](https://github.com/gc-code1piece/main/pull/61) | ✅ |
| A-3.5 외부 연락처 감지 | feature/backend-contact-detection-v0.5 | [#62](https://github.com/gc-code1piece/main/pull/62) | ✅ |
| A-5 프런트 v0.5 실 API 연동 (1차) | feature/frontend-admin-v0.5-integration | [#63](https://github.com/gc-code1piece/main/pull/63) | ✅ |
| A-6 자동 필터링 정합 확인 | chore/backend-auto-filter-mapping | (본 PR) | 🟢 |

## 명세서 정본
- 관리자 API 통합명세서 v2.1 (`docs/md/api/admin/version2.1/`)
- ERD 명세서 v2.1/v2.2 (`docs/md/erd/`)
- v3.0 일괄 업데이트는 모든 기능 + UI/UX + Figma 재구성 완료 후 진행.
