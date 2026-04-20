# gc-dating-app — AI 에이전트 가이드

이 파일은 gc-dating-app 레포에서 AI 코딩 에이전트(Claude Code, Cursor 등)가 작업할 때 따라야 할 협업 규칙과 자동화 원칙을 정의한다.

---

## 1. 프로젝트 개요

- **프로덕트명**: Ember (교환일기 기반 소개팅 앱)
- **레포지토리**: `https://github.com/gc-code1piece/main.git`
- **작업 경로**: `C:\Users\kik32\workspace\gc-dating-app\`
- **구성**:
  - `Frontend/admin/` — Next.js 14 App Router, TypeScript strict, TailwindCSS + shadcn/ui 스타일
  - `Frontend/mobile/` (예정) — Flutter
  - `Backend/` — Spring Boot 3.x (메인), Node.js Express (보조), FastAPI (AI)
  - `ai/` — Python FastAPI, KcELECTRA + KoSimCSE 모델
  - `docs/` — 로컬 전용 명세서 (협업 레포에 푸시하지 않음, `.gitignore` 등록됨)

---

## 2. 협업 규칙 (반드시 준수)

### 2.1 브랜치 & PR
- `main` 브랜치 직접 커밋 **금지**
- 작업은 반드시 새 브랜치에서 시작
- 브랜치 네이밍:
  - `feature/frontend-<작업내용>`
  - `feature/backend-<작업내용>`
  - `feature/ai-<작업내용>`
- `main`을 대상으로 PR 생성 → 리뷰 → 머지
- **작업 시작 전에 항상 `git pull origin main`부터 실행**

### 2.2 문서(docs) 푸시 금지
- `docs/` 이하 모든 `.md` 명세서(ERD/API/기능명세/UI/보안 등)는 협업 레포에 **푸시하지 않는다**.
- `.gitignore`에 `docs/`, `**/docs/`, `*.draft.md`가 등록되어 있음.
- 문서는 로컬 작업 폴더와 Obsidian Vault (`C:\Users\kik32\내 드라이브\Obsidian Vault\Obsidian_School\가천대학교\4학년 1학기\종합프로젝트\백엔드\교환 일기 명세서`)의 **사용자/관리자 분리 폴더**에 미러링한다.
- 협업 레포에는 코드(Frontend/, Backend/, ai/, 설정 파일)만 올린다.

### 2.3 파괴적 작업
- `git push --force`, `git reset --hard`, `rm -rf`, DB drop 등은 **반드시 사용자 확인을 받은 후** 실행한다.
- hook 스킵(`--no-verify`) 금지.

---

## 3. Auto Workflow Rules (AI 에이전트 자동화)

### 3.1 문서 최신 버전 자동 확인 + 최종 일괄 동기화
사용자가 명세서를 첨부하지 않아도 다음 규칙을 자동 적용한다.

- **작업 시작 전**: `docs/md/프로젝트_문서_마스터인덱스.md`를 먼저 읽어 최신 버전(ERD/API/기능명세/UI) 상태를 파악한다. 작업 도메인에 해당하는 가장 높은 버전 폴더(`features/version*`, `erd/version*`, `api/admin/version*`, `api/user/version*`, `ui/admin/version*`, `ui/user/version*`)의 전체 명세서를 읽고, 이를 기준으로 코드를 작성한다.
- **작업 중 (누적만)**: 스펙에 영향을 주는 변경이 발생하면 곧바로 버전업하지 않고 **변경 노트(작업 메모)로만 누적 수집**한다. 잦은 버전업은 문서 관리가 오히려 복잡해지고 정합성 이슈를 유발하기 때문이다.
- **기능·스프린트·마일스톤 단위 종료 시 (일괄 업데이트)**: 누적된 변경을 한 번에 정리해 버전을 올린다.
  - Major 변경 → version +1.0 (예: 2.1 → 3.0)
  - Minor 변경 → version +0.1 (예: 2.1 → 2.2)
  - 버전업 1회로 3종 세트 동시 생성: ① 전체 명세서 ② 요약본 ③ 변경사항(changelog)
  - ERD·API·기능명세·UI 간 정합성을 이 시점에 일괄 검증한다.
- **최종 동기화**: Obsidian Vault에 미러링하고 마스터인덱스의 "최신 스냅샷" 섹션을 갱신한다.

### 3.2 컨텍스트 60% 초과 시 auto-compact
- 긴 세션에서 컨텍스트 사용량이 60%를 넘으면 `/compact`를 선제 수행한다.
- 트랜잭션성 편집(파일 쓰기·빌드 검증) 중이면 해당 블록을 마친 직후에 compact한다.
- compact 직후에는 메모리·plan·현 브랜치 상태를 한 문장으로 재인용한다.

### 3.3 하이브리드 모델 (Opus / Sonnet)
- **Opus**: 아키텍처 설계, 데이터 분석·매칭 알고리즘, 복잡한 비즈니스 로직, 보안·성능 검토, 명세서 작성.
- **Sonnet**: 단순 리네이밍, Mock 데이터 추가, 템플릿 수정, 문서 포맷 정리.
- 한 기능 안에서도 단계를 나눠 전환한다 (예: 설계=Opus → 구현=Sonnet → 통합 리뷰=Opus).

### 3.4 Gstack 스킬 적극 활용
단계·목적별 대표 매핑:
- 아이디어 검증: `/office-hours` → `/plan-ceo-review`
- 디자인 시스템·다크모드·브랜드: `/design-consultation`
- UI 품질 감사·수정: `/design-review` (수정 포함) / `/plan-design-review` (감사만)
- 아키텍처·데이터 플로우·알고리즘: `/plan-eng-review`
- 코드 리뷰: `/review`
- 조사(버그·이상): `/investigate`
- 실제 브라우저 QA: `/qa` / `/qa-only`
- 보안 감사: `/cso`
- 배포: `/ship` → `/land-and-deploy` → `/canary` → `/benchmark`
- 문서 동기화: `/document-release`
- 회고: `/retro` (또는 `/retro global`)

각 스킬 산출물은 3.1 규칙에 따라 버전 폴더에 보관하고 Vault에도 미러링한다.
`/autoplan` 배치 실행은 사용자 승인 후에만 돌린다. 기본은 단계별 수동 호출.

---

## 4. 코드 컨벤션

### 4.1 공통
- 언어: 모든 대화·주석·커밋 메시지·문서화는 한국어
- 변수/함수명: `camelCase` (영어)
- 컴포넌트/클래스: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- 들여쓰기: 2 spaces
- 날짜/시간: KST(한국 시간) 기준

### 4.2 Frontend (Next.js 14)
- TypeScript strict mode, `any` 사용 금지
- Server Component 우선, 필요 시만 Client Component
- Tailwind CSS + shadcn/ui 스타일
- 상태 관리: Zustand
- 폼: React Hook Form + Zod
- 반응형: Mobile First

### 4.3 Backend (Spring Boot)
- Layered Architecture: Controller → Service → Repository
- DTO 패턴 필수
- 생성자 주입, `@Transactional`은 Service 계층
- 에러 응답은 명확한 HTTP Status Code + 표준 에러 바디

### 4.4 AI (FastAPI)
- KcELECTRA (일기 분석: summary/category/personality/emotion/lifestyle/tone)
- KoSimCSE (매칭 유사도)
- 비동기 파이프라인: BE → RabbitMQ → FastAPI → DB + Redis 캐시(TTL 24h)
- 학습 데이터: 본문 250~1000자, 앱 입력 최소 100자

---

## 5. 명령어

- **Frontend admin 실행**: `cd Frontend/admin && npm run dev`
- **Frontend admin 빌드**: `cd Frontend/admin && npm run build`
- **Backend 실행**: `cd Backend && ./gradlew bootRun`
- **AI 서버 실행**: `cd ai && uvicorn main:app --reload`
- **테스트**: 각 디렉토리 `npm test` / `./gradlew test` / `pytest`
