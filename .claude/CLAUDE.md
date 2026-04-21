# Ember 프로젝트

교환일기 기반 소개팅 앱 (졸업 프로젝트). 프로필 사진 없이 내면을 먼저 알아가는 서비스.

## 레포 구조

```
main/
├── Backend/              ← Spring Boot 3.4.1 + Java 21 (종수, 동원)
├── ai/                   ← FastAPI + PyTorch (AI팀)
├── admin/                ← Next.js 14 관리자 웹
├── Frontend/             ← Flutter 모바일 앱
├── nginx/                ← Nginx 리버스 프록시 설정
├── scripts/              ← 배포 스크립트
├── .github/workflows/    ← GitHub Actions CI/CD
└── docker-compose.yml    ← Nginx + Backend + AI + Redis + RabbitMQ
```

## 기술 스택

- **Backend**: Spring Boot 3.4.1, Java 21, Gradle Kotlin DSL, PostgreSQL (Supabase Cloud), Redis, RabbitMQ
- **AI**: FastAPI, KcELECTRA, KoSimCSE, OpenAI (일기 요약)
- **Admin**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Mobile**: Flutter
- **DB**: Supabase Cloud (dev/prod 동일 인스턴스 사용)
- **인프라**: AWS EC2 (t3.small), Nginx 리버스 프록시, Docker Compose, GitHub Actions CI/CD

## 개발 규칙

- `.claude/specification/` 하위 명세서 전체를 참고하여 구현
- API 명세서를 기본으로 하되, 기능명세서/ERD도 함께 참조
- 명세서 간 충돌 시 API 명세서 우선
- 상세 코딩 규칙은 `.claude/skills/` 참조
- 한국어로 소통

## 로컬 개발

### Backend (local 프로파일)
```bash
# 1. 환경변수 파일 복사 (최초 1회)
cp .env.local.example .env.local

# 2. 인프라 띄우기 (PostgreSQL + Redis + RabbitMQ)
docker compose -f docker-compose.local.yml up -d

# 3. Backend 실행
cd Backend && ./gradlew bootRun

# 4. Swagger 확인
# http://localhost:8080/swagger-ui/index.html
```

- `.env.local`이 있으면 자동으로 local 프로파일 적용
- 로컬 PostgreSQL 사용 (Supabase Cloud 아님), `ddl-auto: create`
- Swagger UI 활성화 (prod에서는 비활성화)

### Admin
```bash
cd admin && npm run dev
```

## 현재 진행 상황 (2026-04-21)

### 완료
- `chore/project-setup` 브랜치에서 초기 세팅 완료 (2026-03-24)
- Spring Boot 프로젝트 구조 (docker-compose, .env, application.yml)
- Supabase Cloud DB 연결 (Session Pooler: `aws-1-ap-northeast-2.pooler.supabase.com`)
- Supabase MCP 연동 완료 (Claude Code에서 DB 직접 조회 가능)
- ERD v2.0 기준 54개 Entity 클래스 생성 (14개 모듈, TutorialPage 신규 포함)
- SKILL.md 기준 도메인별 패키지 구조 (domain/repository/service/controller/dto)
- ErrorCode.java: API 명세서 기준 15개 도메인 ~80개 에러코드 반영
- User.java: `@SQLRestriction("deleted_at IS NULL")` 소프트딜리트 적용
- SKILL.md ErrorCode 섹션 API 명세서 최신 기준 동기화
- FCM 설정 추가
- `chore/deploy-setup` 브랜치에서 배포 인프라 세팅 (2026-04-14)
- docker-compose.yml: Nginx + Backend + AI + Redis + RabbitMQ 5개 서비스
- Nginx 리버스 프록시 (`nginx/nginx.conf`): API/WebSocket/관리자 라우팅
- 순차 기동 배포 스크립트 (`scripts/deploy.sh`): t3.small 메모리 안정화
- GitHub Actions CI/CD (`.github/workflows/deploy.yml`): main push 자동 배포
- Backend `application.yml` prod 프로파일 확장 (forward-headers, multipart, rabbitmq, ai 설정)
- Backend `build.gradle.kts`: `spring-boot-starter-amqp` 추가
- `AiClientConfig.java`: AI 서버 WebClient Bean + X-Internal-Key 헤더
- AI FastAPI 기본 구조 (`ai/Dockerfile`, `main.py`, `models.py`, `requirements.txt`)
- ERD v2.0 반영: Entity 9개 수정 + TutorialPage 신규 (필드 추가, enum 변경, 테이블명 수정)
- 로컬 개발 환경 세팅 (2026-04-16)
- `docker-compose.local.yml`: 로컬 PostgreSQL + Redis + RabbitMQ
- `application.yml` local 프로파일: 로컬 DB, Swagger 활성화, RabbitMQ/AI 연결
- `.env.local.example`: 로컬용 환경변수 템플릿
- `build.gradle.kts`: `.env.local` 우선 로드 지원

## Backend API 구현 현황 (2026-04-21)

### 구현 완료 도메인

#### Auth (인증) — ✅ 완료
- `POST /api/auth/social` — 카카오 소셜 로그인/회원가입 (KakaoOAuthProvider)
- `POST /api/auth/refresh` — JWT 토큰 갱신 (Refresh Token Rotation, Redis)
- `POST /api/auth/logout` — 로그아웃 (AT 블랙리스트 + RT 삭제)
- `POST /api/auth/restore` — 탈퇴 유예 계정 복구
- TokenService: Redis 기반 RT/블랙리스트/복구토큰 관리

#### User (사용자 프로필) — ✅ 완료
- `POST /api/users/nickname/generate` — 랜덤 닉네임 생성 (형용사+명사 조합)
- `POST /api/users/profile` — 프로필 등록 (온보딩 1단계, 닉네임 중복/만 18세 검증)
- `GET /api/users/me` — 내 프로필 조회
- `PATCH /api/users/me/profile` — 프로필 수정 (닉네임 30일 쿨다운)
- `POST /api/users/me/fcm-token` — FCM 토큰 등록/갱신

#### IdealType (이상형) — ✅ 완료
- `GET /api/users/ideal-type/keyword-list` — 이상형 키워드 목록 조회
- `POST /api/users/ideal-type/keywords` — 이상형 키워드 설정 (온보딩 2단계, 최대 3개, ROLE_GUEST→ROLE_USER)

#### Tutorial (튜토리얼) — ✅ 완료
- `GET /api/tutorials/pages` — 튜토리얼 페이지 목록 조회
- `POST /api/users/tutorial/complete` — 튜토리얼 완료 처리

#### System (시스템) — ✅ 완료
- `GET /api/health` — 서버 헬스체크
- `GET /api/system/version` — 앱 버전 확인 (강제/권장 업데이트)
- `POST /api/consent` — 약관/AI 분석 동의 등록

#### Diary (일기) — ✅ 완료
- `GET /api/diaries/today` — 당일 일기 작성 여부 확인
- `POST /api/diaries` — 일기 작성 (일 1회, 200~1000자, ContentScan + OutboxEvent)
- `GET /api/diaries` — 내 일기 목록 조회 (페이징)
- `GET /api/diaries/{diaryId}` — 일기 상세 조회 (AI 키워드 포함)
- `PATCH /api/diaries/{diaryId}` — 당일 일기 수정 (AI 재분석 OutboxEvent 발행)
- `GET /api/diaries/weekly-topic` — 수요일 주제 조회
- `GET /api/diaries/drafts` — 임시저장 목록 조회
- `POST /api/diaries/draft` — 임시저장 생성 (최대 3건)
- `DELETE /api/diaries/draft/{draftId}` — 임시저장 삭제

#### Matching (매칭 탐색) — ✅ 완료 (2026-04-21)
- `GET /api/diaries/explore` — 일기 탐색 (커서 페이징, 이성 필터링)
- `GET /api/diaries/{diaryId}/detail` — 탐색 일기 상세 (성격 키워드, 작성자 다른 일기)
- `GET /api/matching/recommendations` — AI 추천 목록 (KoSimCSE, Redis 캐시, stale 폴백)
- `GET /api/matching/recommendations/{diaryId}/preview` — 블라인드 미리보기
- `GET /api/matching/lifestyle-report` — 라이프스타일 리포트 (일기 5편 이상 활성화)
- `POST /api/matching/{diaryId}/select` — 교환 신청 + 양방향 매칭 감지
- `POST /api/matching/{diaryId}/skip` — 넘기기 (7일 재추천 제외)
- `GET /api/matching/requests` — 받은 매칭 요청 목록
- `POST /api/matching/requests/{matchingId}/accept` — 요청 수락 → 매칭 성사 + ExchangeRoom 생성

#### Exchange (교환일기) — ✅ 완료 (2026-04-21)
- `GET /api/exchange-rooms` — 교환일기 방 목록 조회
- `GET /api/exchange-rooms/{roomId}` — 방 상세 조회 (일기 목록, 턴 상태, 데드라인)
- `GET /api/exchange-rooms/{roomId}/diaries/{diaryId}` — 일기 개별 열람 (readAt 기록)
- `POST /api/exchange-rooms/{roomId}/diaries` — 교환일기 작성 (턴 기반, 200~1000자)
- `POST /api/exchange-rooms/{roomId}/diaries/{diaryId}/reaction` — 감정 리액션 (HEART/SAD/HAPPY/FIRE)
- `GET /api/exchange-rooms/{roomId}/report` — AI 공통점 리포트 조회
- `POST /api/exchange-rooms/{roomId}/next-step` — 관계 확장 선택 (CHAT/CONTINUE)
- `GET /api/exchange-rooms/{roomId}/next-step/status` — 선택 상태 조회
- 만료 스케줄러: 10분 주기, 5초 버퍼, 양측 FCM 알림
- 라운드1: 4턴(2회 왕복), 라운드2(추가): 2턴(1회 왕복)
- ExchangeRoomCompletedEvent → ExchangeReportService AI 리포트 파이프라인 연동

#### Chat (채팅) — ✅ 완료 (2026-04-21)
- `POST /api/exchange-rooms/{roomId}/chat` — 채팅방 생성 (양측 CHAT 선택 시)
- `GET /api/chat-rooms` — 채팅방 목록 조회
- `GET /api/chat-rooms/{roomId}/messages` — 메시지 이력 (커서 기반)
- `GET /api/chat-rooms/{roomId}/profile` — 상대방 프로필 조회
- `POST /api/chat-rooms/{roomId}/messages` — 메시지 전송 (REST)
- `POST /api/chat-rooms/{roomId}/leave` — 채팅방 나가기 (시스템 메시지 + WebSocket 브로드캐스트)
- WebSocket STOMP: `/ws/chat` 연결, `/app/chat/{roomId}` 전송, `/topic/chat/{roomId}` 구독
- Redis INCR `MSG:SEQ:{chatRoomId}` sequenceId 발급
- 외부 연락처 정규식 탐지 (전화번호, 카카오, 인스타 등)

#### Couple (커플) — ✅ 완료 (2026-04-21)
- `POST /api/chat-rooms/{roomId}/couple-request` — 커플 요청 (72시간 만료, 24h/48h 리마인드)
- `POST /api/chat-rooms/{roomId}/couple-accept` — 커플 수락 (Couple INSERT + ChatRoom COUPLE_CONFIRMED)
- `POST /api/chat-rooms/{roomId}/couple-reject` — 커플 거절

### 미구현 도메인 (Entity만 존재)
- AiReport (AI 리포트) — Controller/Service 없음
- Report (신고) — Controller/Service 없음
- Topic (주제) — Controller/Service 없음
- Admin (관리자) — Controller/Service 없음

### 알려진 TODO
- FcmService: 만료된 FCM 토큰 자동 삭제 미구현 (`global/notification/FcmService.java:42`)
- **[v1.0] 일기 상세 Redis 캐시** — `AI:DIARY:{diaryId}` 캐시 조회/갱신 + 수정 시 캐시 무효화
- **[v1.0] 임시저장 Redis 동기화** — `DRAFT:{userId}:{date}` Redis 저장 (TTL 24h) + 멀티 디바이스 동기화

## API 테스트 앱 (2026-04-21)

- **위치**: `test_frontend/` (Flutter)
- **대상 서버**: `https://ember-app.duckdns.org` (배포 서버)
- **테스트 가능 API**: 도메인 1~8 전체 (인증, 온보딩, 일기, 매칭, 교환일기, 채팅, 커플)
- **Dev 로그인**: 카카오 없이 userId 지정 로그인 (로컬/배포 모두 가능, `/api/dev/token`)
- **탭 구성**: 일기 쓰기 | 히스토리 | 탐색 | 교환일기 | 채팅 | 임시저장 | 설정
- **교환일기 탭**: 방 목록, 방 상세(턴/일기/리액션), 일기 작성, 관계 확장 선택, AI 리포트
- **채팅 탭**: 채팅방 목록, 메시지 전송/수신(3초 폴링), 상대 프로필, 커플 요청/수락/거절, 나가기
- **매칭 성사 시**: 자동으로 교환일기 탭으로 이동

## 개발 진행 방식

- **개발 순서**: `.claude/백엔드_일일_개발스케줄.md` 참조 (박종수/이동원 번갈아 진행)
- **명세서가 절대 기준**: `.claude/specification/` 하위 문서 참조
- **코딩 규칙**: `.claude/skills/spring-api-rules/SKILL.md` 준수
- **작업 흐름**: 스케줄 확인 → 해당 작업의 명세서 참조 → SKILL.md 규칙 준수하며 구현
- 작업 완료 시 아래 체크리스트에 체크 표시로 업데이트

## 개발 체크리스트

### v0.3 (인증, 프로필, 일기, 매칭탐색)
- [x] DB 스키마 설계 & 초기 프로젝트 세팅 — 박종수 ✅ (사전 완료)
- [x] 카카오 OAuth 소셜 회원가입/로그인 API + JWT 토큰 발급/갱신 — 이동원 ✅
- [x] 로그아웃 + RT Rotation + SecureStorage 연동 — 박종수 ✅
- [x] 기본 프로필 설정 API + 닉네임 랜덤 생성 + 이상형 키워드 설정 — 이동원 ✅
- [x] 일기 작성 CRUD API + 히스토리 조회 + 당일 수정 — 박종수 ✅
- [x] 일기 탐색 API (블라인드 노출) + 선택/넘기기 + 매칭 요청 — 박종수 ✅ (매칭 요청 수락 API 추가)

### v0.5 (교환일기, AI 연동, 채팅, 커플) ★ 진도평가
- [x] 교환일기 매칭 성사 & 방 생성 + 릴레이 작성 API (4턴) — 박종수 ✅
- [ ] 교환일기 수신 알림 + 리마인드 + 만료 처리 + 감정 리액션 — 이동원
- [ ] KcELECTRA 성격 분석 비동기 처리 (RabbitMQ) + AI 프로필 키워드 추출 — 박종수
- [x] 관계 확장 양방향 선택 + 자동 1턴 연장 + 채팅방 생성 트리거 — 박종수 ✅ (이동원 대신 구현)
- [x] 1:1 채팅 API (WebSocket STOMP) + 실시간 메시지 + 읽음 확인 + 커플 요청/수락 — 박종수 ✅

### v0.7 (관리자, 콘텐츠, 신고, 검열)
- [ ] 관리자 로그인/토큰갱신 + 비밀번호 변경 + RBAC — 이동원
- [ ] 관리자 계정 CRUD + KPI 대시보드 API — 박종수
- [ ] 회원 목록/상세 조회 + 회원 제재 + 활동 타임라인 — 이동원
- [ ] 콘텐츠 관리 + 신고 처리 + 차단 관리 + 검열 기능 — 박종수

### v0.9 (보안, 분석, 운영도구, 시스템설정)
- [ ] FCM 푸시 알림 + 알림 센터 + 신고 + 차단/매칭 영구 제외 — 이동원
- [ ] 회원 탈퇴(30일 유예) + 계정 복구 + 암호화 + 제재 알림/이의신청 — 박종수
- [ ] Rate Limiting + 입력값 보안 + 로그 마스킹 — 이동원
- [ ] 관리자 분석 API + 리포트 내보내기 + 운영 효율화 도구 — 박종수
- [ ] 시스템 설정 + 확장 기능 (임시저장, 공지사항, FAQ, 튜토리얼) — 이동원

### v1.0 (최적화 & 검증) ★ 진도평가
- [ ] 전체 API 통합 테스트 + 시나리오 테스트 — 박종수
- [ ] API 성능 최적화 (N+1, 인덱스, Redis 캐싱) — 이동원
- [ ] 버그 수정 + 엣지케이스 + 에러 핸들링 보강 — 박종수
- [ ] 코드 정리 + API 문서 최종 정리 — 이동원
- [ ] 최종 검증 + 배포 준비 완료 — 박종수

### 명세서 (`.claude/specification/` — 레포 내 참조용)
- ERD: `ERD_명세서_v2_1.md` (53개 테이블) + `v2_2.md` (증분: +3 테이블)
- 사용자 API: `사용자_API_통합명세서_v2_2.md` (최신, 4.6/4.7 매칭 요청 수락 추가)
- 관리자 API: `관리자_API_통합명세서_v2.0.md`
- 사용자 기능명세서: `사용자_기능명세서_v2_2_1.md` (최신 정본, 5.5 받은 요청 추가) + `v2_3.md` (증분, AI 파이프라인)
- 관리자 기능명세서: `관리자_기능명세서_v2.0.md`
- 화면API매핑: `엠버_화면API매핑_v12.md` (5.5 받은 요청 화면 추가)
- 변경사항: `사용자_API_v2_2_변경사항.md`, `사용자_명세서_v2_2_1_변경사항.md`
- 배포 가이드: `GACHON_DEPLOYMENT.md`

## 설계서 작성 현황 (2026-03-30)

### 8.2 논리적 설계 (테이블 명세서)
- **파일**: `C:\Users\jjang\OneDrive\바탕 화면\졸프\문서\설계서\데이터 설계\Ember_테이블명세서.xlsx`
- **생성 스크립트**: `create_docx.py` (같은 폴더)
- **docx 출력**: `Ember_테이블명세서_전체.docx`
- **형식**: `NO | Attribute | Data Type | 제약조건 | Description` (5칸)
  - 제약조건: PK, NN / FK, NN / UQ, NN 등 한 칸에 합침
  - FK 참조: Description에 `사용자 ID (FK: users.id)` 형식으로 표기
  - UQ는 원래 붙어있는 것 그대로 유지
  - 헤더: `테이블명(한글명) :       영문테이블명` (한 줄 합침)
- **폰트**: 맑은 고딕, 9pt
- **열 너비**: Attribute/DataType/제약조건은 최소, Description에 남은 폭 몰아줌
- **tblLayout="fixed"** 강제 적용 (내용 길이에 따라 자동 조절 안 됨)
- **Excel → HWP 복붙 시 문제**: 크기/폰트 깨짐 → docx로 생성 후 HWP에서 열기 방식 권장

### 8.3 로그파일 설계 & 8.4 오류코드 설계
- **파일**: `C:\Users\jjang\OneDrive\바탕 화면\졸프\문서\설계서\데이터 설계\8.3_8.4_로그_오류코드_설계.md`
- **8.3.1 애플리케이션 운영 로그**: 파일명 `ember_{yyyyMMdd}.log`, 레벨 ERROR/WARN/INFO, 30일 보관
  - 로그 포맷에 에러 코드 포함: `[WARN] 401 A002 : 만료된 토큰`
- **8.3.2 DB 로그 테이블**: 6개 (admin_audit_logs, admin_login_logs, admin_pii_access_log, admin_password_change_logs, user_activity_events, diary_edit_logs)
  - 보관 정책: 감사/PII/비밀번호 = 영구, 로그인 = 90일, 사용자활동/일기수정 = 365일
  - ⚠️ 보관 정책 기간은 명세서에 없어서 일반 관례로 제안한 것 (팀원 확인 필요)
- **8.4.1 오류코드 분류 체계**: 17개 접두사 (C, A, U, D, M, ER, NS, CR, R, B, AI, ADM, NT, SP, AP, SC, AC)
- **8.4.2 오류코드 목록**: 성공 응답(200/201/202/204) + 에러코드 약 70개 (전부 명세서 기반)
- **8.4.3 오류 응답 JSON 형식**: `{ "code": "D001", "message": "...", "status": 409 }`
- **8.4.4 오류파일**: 운영 로그와 동일 파일에 에러코드 포함하여 기록

### 설계서 작성 참고사항
- ERD 명세서 출처: `C:\Users\jjang\OneDrive\바탕 화면\졸프\문서\ERD명세서\ERD_명세서.md`
- 관리자 API 출처: `.claude/specification/관리자_API_통합명세서_v2.0.md`
- 사용자 API 출처: `.claude/specification/사용자_API_통합명세서_v2.0.md`
- TIMESTAMPTZ = PostgreSQL의 TIMESTAMP WITH TIME ZONE (그대로 사용하기로 함)
- JSONB = PostgreSQL JSON Binary 타입 (유동적 구조 데이터 저장용)
- id 칼럼 Description: `사용자 ID`, `일기 ID` 등 간결한 형태로 통일

## 주요 문서

| 문서 | 위치 |
|------|------|
| Backend 개발 표준 | `.claude/skills/spring-api-rules/SKILL.md` |
| Admin 개발 표준 | `.claude/skills/admin-api-rules/ADMIN_SKILL.md` |
| AI 서버 개발 표준 | `.claude/skills/ai-api-rules/AI_SERVER_SKILL.md` |
| 카카오 로그인 세팅 가이드 | `.claude/kakao-login-setup.md` |

## Flutter 테스트 앱 실행 방법

### 사전 준비
- Android Studio 설치
- Flutter SDK: `C:\flutter` (PATH 등록 안 되어 있음, CLI에서는 `/c/flutter/bin/flutter` 사용)
- Android 에뮬레이터 설정 완료

### 실행 순서
1. Android Studio에서 에뮬레이터 실행 (Device Manager → 원하는 에뮬 시작)
2. Claude Code에서 아래 명령어로 앱 빌드 & 실행:
```bash
cd C:/Users/jjang/main/test_frontend && /c/flutter/bin/flutter pub get
/c/flutter/bin/flutter run -d emulator-5554
```
3. 에뮬레이터에 앱이 뜨면 버튼 순서대로 테스트

### 카카오 로그인 테스트 시 필요사항
- 카카오 디벨로퍼에 Android 플랫폼 등록 필요
  - 패키지명: `com.example.test_frontend`
  - 디버그 키 해시: `yttvOS9aCtvZ1OZZdU/3OvbtIjw=`
- 에뮬레이터에 카카오톡 미설치 시 → 카카오 계정 웹 로그인으로 대체됨

## API 테스트 진행 기록 (2026-04-21)

### 배포 서버 API 테스트 (curl) — 전체 통과
| 단계 | API | 결과 |
|------|-----|------|
| 헬스체크 | `GET /api/health` | 통과 |
| 소셜 로그인 | `POST /api/auth/social` | 통과 (userId=8, 신규가입) |
| 약관 동의 | `POST /api/consent` x2 | 통과 (USER_TERMS, AI_TERMS) |
| 닉네임 생성 | `POST /api/users/nickname/generate` | 통과 ("건강한하늘") |
| 프로필 등록 | `POST /api/users/profile` | 통과 (온보딩 1단계) |
| 키워드 목록 | `GET /api/users/ideal-type/keyword-list` | 통과 (10개) |
| 이상형 설정 | `POST /api/users/ideal-type/keywords` | 통과 (온보딩 2단계, ROLE_USER 승격) |
| 프로필 조회 | `GET /api/users/me` | 통과 (onboardingCompleted=true) |

### 도메인 5 매칭 탐색 테스트 — 로컬 + 배포 전체 통과 (2026-04-21)
| 단계 | API | 결과 |
|------|-----|------|
| 일기 탐색 | `GET /api/diaries/explore` | 통과 (상대방 일기 3건 정상 노출) |
| 일기 상세 | `GET /api/diaries/{id}/detail` | 통과 |
| 블라인드 미리보기 | `GET /api/matching/recommendations/{id}/preview` | 통과 |
| 라이프스타일 리포트 | `GET /api/matching/lifestyle-report` | 통과 (5편 미만 안내 메시지) |
| 교환 신청 | `POST /api/matching/{id}/select` | 통과 (PENDING, 알림 저장) |
| 넘기기 | `POST /api/matching/{id}/skip` | 통과 |
| 받은 요청 목록 | `GET /api/matching/requests` | 통과 (닉네임, 연령대, 미리보기) |
| 요청 수락 | `POST /api/matching/requests/{id}/accept` | 통과 (매칭 성사, roomUuid 생성) |
| 알림 저장 확인 | DB 직접 조회 | 통과 (MATCHING_REQUEST + MATCHING_MATCHED 양쪽) |

### Flutter 앱 테스트 (에뮬레이터) — 통과
- 카카오 SDK 로그인 → 서버 로그인 → 전체 온보딩 플로우 정상 동작 확인
- Dev 로그인 → 탐색 탭 → 미리보기 → 교환 신청/넘기기 → 받은 요청 수락 정상 동작 확인

### 도메인 6~8 교환일기/채팅/커플 테스트 — 로컬 + 배포 전체 통과 (2026-04-21)

#### 로컬 curl 테스트 (17개 API)
| 단계 | API | 결과 |
|------|-----|------|
| 교환방 목록 | `GET /api/exchange-rooms` | 통과 |
| 교환방 상세 | `GET /api/exchange-rooms/{id}` | 통과 |
| 교환일기 작성 턴1~4 | `POST /api/exchange-rooms/{id}/diaries` | 통과 (4턴 완주) |
| 일기 열람 (readAt) | `GET /api/exchange-rooms/{id}/diaries/{id}` | 통과 |
| 리액션 등록 | `POST .../reaction` | 통과 (HEART) |
| 관계 확장 - 양측 CHAT | `POST .../next-step` | 통과 (CHAT_CREATED) |
| 관계 확장 - 불일치 | `POST .../next-step` | 통과 (AUTO_EXTENDED, roundCount=2) |
| 선택 상태 조회 | `GET .../next-step/status` | 통과 |
| 리포트 조회 | `GET .../report` | 통과 (ER007 분석 중) |
| 채팅방 목록 | `GET /api/chat-rooms` | 통과 |
| 상대 프로필 | `GET /api/chat-rooms/{id}/profile` | 통과 |
| 커플 요청 | `POST .../couple-request` | 통과 (72h 만료, 리마인드 스케줄) |
| 중복 요청 방지 | `POST .../couple-request` | 통과 (CR003) |
| 커플 수락 | `POST .../couple-accept` | 통과 (COUPLE_CONFIRMED) |
| 채팅방 나가기 | `POST .../leave` | 통과 (시스템 메시지 생성) |
| 강제 완주 (Dev) | `POST /api/dev/.../force-complete` | 통과 |

#### Flutter 앱 테스트 (에뮬레이터 + 실제 폰) — 통과
- 에뮬레이터(맑은바다) + 실제 폰(건강한하늘) 양방향 동시 테스트
- 일기 작성 → 탐색 → 교환 신청 → 수락 → 교환일기 4턴 릴레이 → 관계 확장 → 채팅 → 커플 전체 플로우 정상 동작
- 채팅 메시지 전송/수신 (3초 폴링), 커플 요청/수락/거절 정상 동작

#### 배포 서버 테스트 — 통과
- 폰에서 배포 서버(`https://ember-app.duckdns.org`) 대상 전체 플로우 테스트 통과
- DB 체크 제약조건 이슈 발견 → `exchange_rooms_status_check`에 `CHAT_CONNECTED`, `ENDED` 추가로 해결
- `couples_status_check`에 `ACTIVE` 추가, `exchange_reports_status_check`에 `CONSENT_REQUIRED` 추가

### 발견된 이슈
- curl에서 한글 JSON 전송 시 UTF-8 인코딩 문제 발생 (`Invalid UTF-8 start byte 0xb0`)
  - 해결: `--data-binary` + heredoc 사용으로 UTF-8 보장
- FcmService: 만료된 FCM 토큰 자동 삭제 미구현 (`global/notification/FcmService.java:42`)
- prod DB에 `visibility` 컬럼 없어서 탐색 API 500 에러 → Supabase에서 수동 추가로 해결
- prod DB `exchange_rooms_status_check`에 `CHAT_CONNECTED`/`ENDED` 누락 → Supabase에서 수동 추가로 해결
- `DiaryCreateRequest`에 `visibility` 필드 필수 — 앱에서 `PRIVATE` 값 전송 필요
