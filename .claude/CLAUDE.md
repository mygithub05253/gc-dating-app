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

## 현재 진행 상황 (2026-04-14)

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

## 개발 진행 방식

- **개발 순서**: `.claude/백엔드_일일_개발스케줄.md` 참조 (박종수/이동원 번갈아 진행)
- **명세서가 절대 기준**: `.claude/specification/` 하위 문서 참조
- **코딩 규칙**: `.claude/skills/spring-api-rules/SKILL.md` 준수
- **작업 흐름**: 스케줄 확인 → 해당 작업의 명세서 참조 → SKILL.md 규칙 준수하며 구현
- 작업 완료 시 아래 체크리스트에 체크 표시로 업데이트

## 개발 체크리스트

### v0.3 (인증, 프로필, 일기, 매칭탐색)
- [x] DB 스키마 설계 & 초기 프로젝트 세팅 — 박종수 ✅ (사전 완료)
- [ ] 카카오 OAuth 소셜 회원가입/로그인 API + JWT 토큰 발급/갱신 — 이동원
- [ ] 로그아웃 + RT Rotation + SecureStorage 연동 — 박종수
- [ ] 기본 프로필 설정 API + 닉네임 랜덤 생성 + 이상형 키워드 설정 — 이동원
- [ ] 일기 작성 CRUD API + 히스토리 조회 + 당일 수정 — 박종수
- [ ] 일기 탐색 API (블라인드 노출) + 선택/넘기기 + 매칭 요청 — 이동원

### v0.5 (교환일기, AI 연동, 채팅, 커플) ★ 진도평가
- [ ] 교환일기 매칭 성사 & 방 생성 + 릴레이 작성 API (4턴) — 박종수
- [ ] 교환일기 수신 알림 + 리마인드 + 만료 처리 + 감정 리액션 — 이동원
- [ ] KcELECTRA 성격 분석 비동기 처리 (RabbitMQ) + AI 프로필 키워드 추출 — 박종수
- [ ] 관계 확장 양방향 선택 + 자동 1턴 연장 + 채팅방 생성 트리거 — 이동원
- [ ] 1:1 채팅 API (WebSocket STOMP) + 실시간 메시지 + 읽음 확인 + 커플 요청/수락 — 박종수

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
- ERD: `ERD_명세서_v2.0.md` (54개 테이블)
- 사용자 API: `사용자_API_통합명세서_v2.0.md`
- 관리자 API: `관리자_API_통합명세서_v2.0.md`
- 사용자 기능명세서: `사용자_기능명세서_v2.0.md`
- 관리자 기능명세서: `관리자_기능명세서_v2.0.md`
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
