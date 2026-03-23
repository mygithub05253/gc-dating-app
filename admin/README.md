# Ember Admin Dashboard

교환일기 소개팅 앱 **Ember**의 관리자 대시보드입니다.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **State Management**: Zustand
- **Icons**: Lucide React

## Features

### 회원 관리
- 회원 목록 조회 및 상세 정보
- 의심 계정 탐지 (봇, 스팸, 다중 계정 등)

### 신고 관리
- 신고 목록 및 처리
- 차단 이력 관리
- 외부 연락처 감지 (AI 기반)
- 신고 패턴 분석 대시보드

### 콘텐츠 관리
- 랜덤 주제 관리
- 큐레이션 관리
- 약관 관리 (서비스, 개인정보, 위치정보 등)
- 공지사항 관리

### AI 모니터링
- AI 성능 현황 (KoSimCSE, KcELECTRA)
- A/B 테스트 관리

### 분석
- 매칭 분석
- 리텐션 분석
- 일기 패턴 분석
- 퍼널 분석

### 마케팅
- 이벤트/프로모션 관리

### 시스템
- 시스템 현황 모니터링 (Supabase, Redis, AI 서버)
- 관리자 계정 관리
- 활동 로그
- 기능 플래그 관리
- 배치 스케줄 관리

### 고객지원
- 문의 관리
- 이의신청 처리

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Environment Variables

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Project Structure

```
src/
├── app/
│   └── admin/
│       ├── dashboard/      # 대시보드
│       ├── users/          # 회원 관리
│       ├── reports/        # 신고 관리
│       ├── content/        # 콘텐츠 관리
│       ├── ai/             # AI 모니터링
│       ├── analytics/      # 분석
│       ├── marketing/      # 마케팅
│       ├── system/         # 시스템
│       └── support/        # 고객지원
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트
│   ├── layout/             # 레이아웃 (Sidebar, Header)
│   ├── dashboard/          # 대시보드 컴포넌트
│   └── common/             # 공통 컴포넌트
├── hooks/                  # Custom hooks
├── lib/                    # 유틸리티
└── stores/                 # Zustand stores
```

## Scripts

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

## Related Repositories

- [Ember Backend (Spring Boot)](https://github.com/your-org/ember-backend)
- [Ember AI Server (FastAPI)](https://github.com/your-org/ember-ai)
- [Ember Mobile App](https://github.com/your-org/ember-app)

## License

Private - All rights reserved
