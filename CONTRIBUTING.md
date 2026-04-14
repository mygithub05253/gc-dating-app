# Ember 개발 & 배포 가이드

## 전체 흐름

```
1. 내 브랜치에서 작업 → 2. PR 생성 → 3. main 머지 → 4. 자동 배포 (EC2)
```

**main 브랜치에 머지되는 순간 GitHub Actions가 자동으로 EC2 서버에 배포합니다.**
별도로 서버에 접속하거나 수동 배포할 필요 없습니다.

## 작업 방법

### 1. 브랜치 생성
```bash
git checkout main
git pull origin main
git checkout -b feature/backend-auth    # 본인 작업 브랜치
```

### 2. 작업 후 커밋 & 푸시
```bash
git add .
git commit -m "feat: 소셜 로그인 API 구현"
git push origin feature/backend-auth
```

### 3. PR 생성
- GitHub에서 **Pull Request** 생성 → `main` 브랜치로 머지 요청
- 리뷰 후 **Merge** 클릭

### 4. 자동 배포
- main에 머지되면 **GitHub Actions**가 실행됨
- 약 5~10분 후 EC2 서버에 반영 완료
- 배포 상태 확인: [Actions 탭](https://github.com/gc-code1piece/main/actions)

## 배포 구조

```
GitHub (main 머지)
    ↓  GitHub Actions (자동)
AWS EC2 (t3.small)
    ├── Nginx        ← 외부 요청 수신 (80번 포트)
    ├── Backend      ← Spring Boot API (내부 8080)
    ├── AI           ← FastAPI + KcELECTRA/KoSimCSE (내부 8000)
    ├── Redis        ← 세션/캐시 (내부 6379)
    └── RabbitMQ     ← Backend ↔ AI 메시지 큐 (내부 5672)
    
Supabase Cloud     ← PostgreSQL 데이터베이스
Vercel             ← 관리자 웹 (Next.js, 별도 자동 배포)
```

- 모든 서비스는 **Docker 컨테이너**로 실행
- 외부에서 접근 가능한 포트는 **80 (Nginx)** 뿐, 나머지는 내부 통신

## 배포 확인 방법

```bash
# 서버 헬스체크 (브라우저 또는 터미널)
curl http://3.35.11.196/health
# → ok 가 나오면 정상
```

- EC2 서버에서 파일 직접 수정 금지 (다음 배포 시 git pull 충돌 발생)
- 배포 실패 시 [Actions 탭](https://github.com/gc-code1piece/main/actions)에서 로그 확인
