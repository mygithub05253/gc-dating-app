# Ember 프로젝트 현황 (2026-04-14)

## 현재 상태: 배포 인프라 세팅 완료

서버 배포가 완료되어 **코드를 작성하면 자동으로 서버에 반영**됩니다.

---

## 서버 주소

| 용도 | URL |
|------|-----|
| API 서버 | `https://ember-app.duckdns.org` |
| 헬스체크 | `https://ember-app.duckdns.org/health` |
| WebSocket | `wss://ember-app.duckdns.org/ws/chat` |
| 관리자 헬스체크 | Vercel URL + `/admin/health-check` |

> HTTPS 적용 완료 (Let's Encrypt SSL 인증서, 자동 갱신)
> Dynamic DNS로 IP 변경 자동 대응 — IP가 바뀌어도 주소 그대로

---

## 배포 구조

```
GitHub main 머지 → GitHub Actions (자동) → AWS EC2 서버 배포
                                          ↓
                              Nginx (HTTPS 443 수신)
                                ├── Backend (Spring Boot)
                                ├── AI (FastAPI)
                                ├── Redis
                                └── RabbitMQ

Vercel → 관리자 웹 (Next.js, 별도 자동 배포)
Flutter → 모바일 앱 (EC2 API 호출)
DB → Supabase Cloud (PostgreSQL)
```

## 완료된 것

### 서버 (EC2)
- AWS EC2 인스턴스 생성 + Docker 환경 구성
- **5개 컨테이너** 정상 가동 (Nginx, Backend, AI, Redis, RabbitMQ)
- **HTTPS 적용 완료** (Let's Encrypt + DuckDNS)
- Dynamic DNS 설정 (`ember-app.duckdns.org`, IP 변경 자동 대응)

### CI/CD
- **main 브랜치에 머지하면 자동 배포** (GitHub Actions)
- 배포 시간 약 5~10분
- **EC2 배포 대상**: `Backend/`, `ai/`, `docker-compose.yml` 변경 시 (nginx, scripts는 Backend/ 내부)
- **EC2 배포 안 됨**: `Frontend/` (admin 포함), 문서 파일 등 (Admin은 Vercel이 별도 배포)

### 관리자 웹 (Vercel)
- Vercel 배포 완료
- **Backend 연결 확인 완료** (Vercel → EC2 통신 정상)
- main 머지 시 Vercel도 자동 재배포

### Backend
- ERD v2.0 기준 54개 Entity 세팅 완료
- Supabase Cloud DB 연결 + 테이블 자동 생성
- SecurityConfig (CORS), WebSocketConfig (STOMP) 설정 완료
- AI 서버 통신용 WebClient 설정 완료

### AI 서버
- FastAPI 기본 구조 세팅 (Dockerfile, main.py, models.py)
- KcELECTRA + KoSimCSE 모델 FP16 로드 구조
- `/health`, `/warmup`, `/ready`, `/embed` 엔드포인트

### 로컬 개발 환경
- **`docker-compose.local.yml`**: 로컬 PostgreSQL + Redis + RabbitMQ
- **local 프로파일**: 로컬 DB 연결, Swagger UI 활성화, RabbitMQ/AI 연결 설정
- **Swagger UI**: `http://localhost:8080/swagger-ui/index.html` (local 프로파일에서만 접근 가능)
- 사용법: `.env.local.example` → `.env.local` 복사 후 `docker compose -f docker-compose.local.yml up -d` → `./gradlew bootRun`

---

## 팀별 작업 가이드

### Backend 팀
- `Backend/` 폴더에서 API 구현 → PR → main 머지 → 자동 배포
- 다음 작업: **핵심 API 구현** (인증 → 일기 → 매칭 → 교환일기 순서 권장)

### AI 팀
- `ai/` 폴더에서 작업 → PR → main 머지 → 자동 배포
- 현재 기본 구조만 세팅된 상태. 실제 분석/매칭/리포트 로직 구현 필요
- `ai/main.py`, `ai/models.py` 수정하거나 파일 추가하면 됨
- Docker, 서버 접속 몰라도 됨. **코드만 작성하면 자동 반영**
- Backend와 통신: Backend가 `http://ai:8000`으로 호출 (Docker 내부 네트워크)

#### 주의사항 (반드시 지켜야 배포가 정상 동작합니다)
- **`main.py` 파일명 변경 금지** — Dockerfile에서 `uvicorn main:app`으로 실행하므로 이름 바꾸면 배포 실패
- **`app = FastAPI()` 변수명 변경 금지** — `uvicorn main:app`에서 `app` 객체를 참조하므로 변경 시 배포 실패
- **`/health` 엔드포인트 유지 필수** — 배포 스크립트가 `/health`로 AI 서버 정상 기동을 확인함
- **`/warmup` 엔드포인트 유지 필수** — 배포 시 모델 사전 로딩에 사용됨

#### 구현해야 할 AI 내부 API (Backend가 호출)
| 엔드포인트 | 방식 | 설명 | 사용 모델 |
|------------|------|------|-----------|
| `POST /api/diary/analyze` | 비동기 (RabbitMQ) | 일기 분석 → 6종 출력 (summary, category, emotionTags 등) | KcELECTRA |
| `POST /api/matching/calculate` | 동기 (10초 타임아웃) | 유사도 매칭 점수 + 브리핑 생성 | KoSimCSE |
| `POST /api/exchange/report` | 비동기 (RabbitMQ) | 교환일기 4턴 완료 후 공통점 리포트 생성 | KcELECTRA + KoSimCSE + TF-IDF |
| `POST /api/content/scan` | 동기 (3초 타임아웃) | 금칙어 + 외부 연락처 탐지 (정규식 기반) | 모델 미사용 |

#### 모델 관련
- 현재 HuggingFace에서 **KcELECTRA** (`beomi/KcELECTRA-base`), **KoSimCSE** (`BM-K/KoSimCSE-roberta`) 프리트레인 모델을 로드하는 구조
- 팀에서 **파인튜닝한 모델을 사용할 경우**, `ai/models.py`에서 모델 경로만 변경하면 됨
- 모델 파일은 Docker 볼륨(`hf_models`)에 캐싱되어 재배포 시 재다운로드 불필요
- 최초 배포 시 모델 다운로드에 5~15분 소요될 수 있음 (`/warmup`에서 처리)

#### 추론 결과 저장 & 재학습 (설계서 6.4 기준)
- **추론 결과 저장**: 분석/추천 결과를 DB에 저장하여 재학습용 데이터셋 구성에 활용 (일기 ID, 태그 예측값, 키워드, 임베딩 생성 여부, 모델 버전, 처리 성공 여부 등)
- **모델 재학습**: 관리자가 재학습 트리거 → 최신 데이터셋으로 학습 → validation 성능 검증 → 새 버전 등록
- **모델 버전 관리**: 새 모델은 운영 모델과 분리된 환경에서 검증 후 배포, 문제 시 이전 버전으로 롤백 가능
- **자동 트리거 조건**: F1 Score 기준 30일 주기 자동 재학습 트리거 (관리자 API: `POST /admin/models/retrain`)

### Frontend 팀 (Flutter)
- API 서버: `https://ember-app.duckdns.org`
- 현재 **헬스체크 API만 동작** (`GET /api/health`)
- 인증 API 등 핵심 API는 Backend 팀이 구현 중
- WebSocket 채팅: `wss://ember-app.duckdns.org/ws/chat` (STOMP)
- Android 에뮬레이터에서 로컬 테스트: `http://10.0.2.2:8080`
- **HTTPS 적용 완료** — cleartext 설정 불필요

---

## 아직 안 된 것

| 항목 | 상태 | 담당 |
|------|------|------|
| 인증 API (소셜 로그인) | 미구현 | Backend |
| 일기/매칭/교환일기 API | 미구현 | Backend |
| AI 성격 분석/매칭 로직 | 미구현 | AI |
| Flutter ↔ Backend 실제 연결 테스트 | 미진행 | Frontend + Backend |
| WebSocket 채팅 JWT 인증 | 미구현 | Backend |

---

## 작업 흐름 (모든 팀 공통)

```
1. main에서 브랜치 생성
2. 작업 후 커밋 & 푸시
3. GitHub에서 PR 생성
4. main에 머지 → 자동 배포 (5~10분)
5. https://ember-app.duckdns.org/health 로 서버 상태 확인
```

**main에 직접 push 금지!** 반드시 PR 머지로.

---

## 주의: EC2 인스턴스 자동 중지

가천대 AWS 계정 정책으로 **EC2 인스턴스가 일정 시간 후 자동 중지**됩니다.

### 인스턴스 재시작 방법
1. AWS 콘솔 로그인 → EC2 → 인스턴스 선택
2. **인스턴스 상태** → **시작**
3. Running 후 약 1~2분 대기 (DuckDNS가 1분 주기로 새 IP 자동 반영)
4. Docker 컨테이너 자동 기동 → Backend 부팅에 추가 15~20초 소요

> Dynamic DNS(DuckDNS) 설정 완료 — IP가 바뀌어도 `ember-app.duckdns.org` 주소는 그대로.
> GitHub Secrets, Vercel, Flutter 주소 변경 불필요.
