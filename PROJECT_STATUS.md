# Ember 프로젝트 현황 (2026-04-14)

## 현재 상태: 배포 인프라 세팅 완료

서버 배포가 완료되어 **코드를 작성하면 자동으로 서버에 반영**됩니다.

---

## 배포 구조

```
GitHub main 머지 → GitHub Actions (자동) → AWS EC2 서버 배포
                                          ↓
                              Nginx (외부 요청 수신)
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
- 서버 헬스체크 확인: `http://3.35.11.196/health` → ok

### CI/CD
- **main 브랜치에 머지하면 자동 배포** (GitHub Actions)
- 배포 시간 약 5~10분
- 어떤 폴더를 수정하든 (`Backend/`, `ai/`, `admin/`) 자동 반영

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

### Frontend 팀 (Flutter)
- EC2 서버 API 주소: `http://3.35.11.196`
- 현재 **헬스체크 API만 동작** (`GET /api/health`)
- 인증 API 등 핵심 API는 Backend 팀이 구현 중
- WebSocket 채팅: `ws://3.35.11.196/ws/chat` (STOMP)
- Android 에뮬레이터에서 로컬 테스트: `http://10.0.2.2:8080`
- **HTTPS는 아직 미적용** (도메인 확보 후 전환 예정)
  - Android: `AndroidManifest.xml`에 `usesCleartextTraffic="true"` 필요
  - iOS: `Info.plist`에 `NSAllowsArbitraryLoads = true` 필요

---

## 아직 안 된 것

| 항목 | 상태 | 담당 |
|------|------|------|
| 인증 API (소셜 로그인) | 미구현 | Backend |
| 일기/매칭/교환일기 API | 미구현 | Backend |
| AI 성격 분석/매칭 로직 | 미구현 | AI |
| Flutter ↔ Backend 실제 연결 테스트 | 미진행 | Frontend + Backend |
| HTTPS (도메인 + SSL) | 미적용 | Backend |
| WebSocket 채팅 JWT 인증 | 미구현 | Backend |

---

## 작업 흐름 (모든 팀 공통)

```
1. main에서 브랜치 생성
2. 작업 후 커밋 & 푸시
3. GitHub에서 PR 생성
4. main에 머지 → 자동 배포 (5~10분)
5. http://3.35.11.196/health 로 서버 상태 확인
```

**main에 직접 push 금지!** 반드시 PR 머지로.

---

## 주의: EC2 인스턴스 자동 중지

가천대 AWS 계정 정책으로 **EC2 인스턴스가 일정 시간 후 자동 중지**됩니다.

### 인스턴스 재시작 방법
1. AWS 콘솔 로그인 → EC2 → 인스턴스 선택
2. **인스턴스 상태** → **시작**
3. Running 후 **퍼블릭 IP 확인** (바뀔 수 있음)

### IP가 바뀌었을 때 업데이트할 곳 (3곳)
1. **GitHub Secrets** → `EC2_HOST` 값 변경 (레포 Settings → Secrets)
2. **Vercel** → `BACKEND_URL` 값 변경 (프로젝트 Settings → Environment Variables)
3. **Flutter** → API Base URL 변경

> Elastic IP를 할당하면 IP가 고정되어 이 작업이 불필요해집니다.
> AWS 콘솔 → EC2 → 탄력적 IP → 할당 → 인스턴스에 연결 (인스턴스에 연결된 상태에서는 무료)
