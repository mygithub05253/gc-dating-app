// ────────────────────────────────────────────────────────
// Ember Signal 세만틱 soft variant 프리셋
// - DESIGN.md v1.0.1 §11: Status Badge 4단계 계층(outline/soft/solid/destructive), 세만틱 토큰 기반
// - Tailwind 팔레트(bg-green-100 등) 하드코딩 금지. 모두 CSS variable + 알파 채널로 다크모드 자동 대응.
// - Phase 2-A (2026-04-21) 일괄 전환
// ────────────────────────────────────────────────────────
export const SOFT = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/10 text-info',
  primary: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent text-accent-foreground',
  muted: 'bg-muted text-muted-foreground',
  // outline 계열 — 배경 제거(Badge 기본 variant의 bg-primary 덮어쓰기), 테두리만
  outlineNeutral: 'bg-transparent border-border text-muted-foreground',
  outlineInfo: 'bg-transparent border-info text-info',
  outlinePrimary: 'bg-transparent border-primary text-primary',
} as const;

// ────────────────────────────────────────────────────────
// 회원 상태 (ERD v2.0 기준 6종)
// ────────────────────────────────────────────────────────
export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  GUEST: '게스트',
  SUSPEND_7D: '7일 정지',
  SUSPEND_30D: '30일 정지',
  BANNED: '영구 정지',
  DEACTIVATED: '탈퇴',
};

export const USER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: SOFT.success,
  GUEST: SOFT.muted,
  SUSPEND_7D: SOFT.warning,
  SUSPEND_30D: SOFT.primary, // Ember orange — 장기 정지 강조
  BANNED: SOFT.destructive,
  DEACTIVATED: SOFT.outlineNeutral,
};

// ────────────────────────────────────────────────────────
// 성별 (ERD v2.0 기준: MALE / FEMALE)
// ────────────────────────────────────────────────────────
export const GENDER_LABELS: Record<string, string> = {
  MALE: '남성',
  FEMALE: '여성',
};

// ────────────────────────────────────────────────────────
// 신고 사유 (ERD v2.0 기준 7종)
// ────────────────────────────────────────────────────────
export const REPORT_REASON_LABELS: Record<string, string> = {
  PROFANITY: '욕설/비방',
  SEXUAL: '음란물',
  PERSONAL_INFO: '개인정보 노출',
  HARASSMENT: '괴롭힘',
  IMPERSONATION: '사칭/허위 프로필',
  SPAM: '스팸/광고',
  OTHER: '기타',
};

// ────────────────────────────────────────────────────────
// 신고 상태 (ERD v2.0 기준: IN_REVIEW)
// ────────────────────────────────────────────────────────
export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  IN_REVIEW: '검토 중',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
};

export const REPORT_STATUS_COLORS: Record<string, string> = {
  PENDING: SOFT.warning,
  IN_REVIEW: SOFT.info,
  RESOLVED: SOFT.success,
  DISMISSED: SOFT.muted,
};

// ────────────────────────────────────────────────────────
// 관리자 역할
// ────────────────────────────────────────────────────────
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '최고 관리자',
  ADMIN: '관리자',
  VIEWER: '뷰어',
};

// ────────────────────────────────────────────────────────
// 약관 유형 (ERD v2.0 기준: 2종 통합)
// ────────────────────────────────────────────────────────
export const TERMS_TYPE_LABELS: Record<string, string> = {
  USER_TERMS: '서비스 이용 약관',
  AI_TERMS: 'AI 분석 동의',
};

export const TERMS_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  DRAFT: '초안',
  ARCHIVED: '보관',
};

// ────────────────────────────────────────────────────────
// 공지사항 (ERD v2.0 기준)
// ────────────────────────────────────────────────────────
export const NOTICE_CATEGORY_LABELS: Record<string, string> = {
  GENERAL: '일반',
  MAINTENANCE: '점검',
  TERMS_CHANGE: '약관 변경',
  URGENT: '긴급',
};

export const NOTICE_CATEGORY_COLORS: Record<string, string> = {
  GENERAL: SOFT.muted,
  MAINTENANCE: SOFT.info,
  TERMS_CHANGE: SOFT.primary, // Ember 강조 — 약관 변경은 브랜드 주도 이슈
  URGENT: SOFT.destructive,
};

export const NOTICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  PUBLISHED: '게시',
  HIDDEN: '숨김',
};

export const NOTICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: SOFT.outlineNeutral,
  PUBLISHED: SOFT.success,
  HIDDEN: SOFT.muted,
};

// ────────────────────────────────────────────────────────
// 의심 계정 상태 / 유형
// ────────────────────────────────────────────────────────
export const SUSPICIOUS_ACCOUNT_STATUS_LABELS: Record<string, string> = {
  PENDING: '검토 대기',
  INVESTIGATING: '조사 중',
  CONFIRMED: '확정',
  CLEARED: '해제',
};

export const SUSPICIOUS_ACCOUNT_STATUS_COLORS: Record<string, string> = {
  PENDING: SOFT.warning,
  INVESTIGATING: SOFT.info,
  CONFIRMED: SOFT.destructive,
  CLEARED: SOFT.muted,
};

export const SUSPICION_TYPE_LABELS: Record<string, string> = {
  BOT: '봇 계정',
  FAKE_PROFILE: '가짜 프로필',
  SPAM: '스팸',
  MULTI_ACCOUNT: '다중 계정',
  SCAM: '사기',
};

// ────────────────────────────────────────────────────────
// 금칙어 카테고리 (ERD v2.0 신설)
// ────────────────────────────────────────────────────────
export const BANNED_WORD_CATEGORY_LABELS: Record<string, string> = {
  PROFANITY: '욕설/비방',
  SEXUAL: '음란',
  DISCRIMINATION: '차별/혐오',
  ETC: '기타',
};

export const BANNED_WORD_CATEGORY_COLORS: Record<string, string> = {
  PROFANITY: SOFT.warning,
  SEXUAL: SOFT.primary, // Ember orange — 민감 영역 분리
  DISCRIMINATION: SOFT.destructive, // 가장 심각
  ETC: SOFT.muted,
};

// ────────────────────────────────────────────────────────
// 고객 문의 (관리자 API 통합명세서 v2.0 §17.1)
// ────────────────────────────────────────────────────────
export const INQUIRY_CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: '계정',
  MATCHING: '매칭',
  EXCHANGE: '교환일기',
  CHAT: '채팅',
  PAYMENT: '결제',
  BUG: '버그',
  OTHER: '기타',
};

export const INQUIRY_CATEGORY_COLORS: Record<string, string> = {
  // 7종 카테고리 — 세만틱 토큰 6종 + outline variant 로 구분성 확보
  ACCOUNT: SOFT.info,
  MATCHING: SOFT.primary, // Ember 핵심 기능
  EXCHANGE: SOFT.accent, // 따뜻한 톤 (교환일기 브랜드 DNA)
  CHAT: SOFT.outlineInfo,
  PAYMENT: SOFT.success,
  BUG: SOFT.destructive,
  OTHER: SOFT.muted,
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  OPEN: '대기 중',
  IN_PROGRESS: '처리 중',
  RESOLVED: '답변 완료',
  CLOSED: '종료',
};

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  OPEN: SOFT.warning,
  IN_PROGRESS: SOFT.info,
  RESOLVED: SOFT.success,
  CLOSED: SOFT.muted,
};

// ────────────────────────────────────────────────────────
// 이의신청 (관리자 API 통합명세서 v2.0 §17.2)
// ────────────────────────────────────────────────────────
export const APPEAL_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  IN_PROGRESS: '검토 중',
  ACCEPTED: '수락',
  REJECTED: '기각',
};

export const APPEAL_STATUS_COLORS: Record<string, string> = {
  PENDING: SOFT.warning, // 이의신청 대기 — 경고 톤
  IN_PROGRESS: SOFT.info,
  ACCEPTED: SOFT.success,
  REJECTED: SOFT.muted,
};

export const SANCTION_TYPE_LABELS: Record<string, string> = {
  WARNING: '경고',
  SUSPEND_7D: '7일 정지',
  SUSPEND_30D: '30일 정지',
  BANNED: '영구 정지',
};

export const APPEAL_DECISION_LABELS: Record<string, string> = {
  MAINTAIN: '유지',
  REDUCE: '감경',
  RELEASE: '해제',
};

export const APPEAL_DECISION_COLORS: Record<string, string> = {
  MAINTAIN: SOFT.muted,
  REDUCE: SOFT.warning,
  RELEASE: SOFT.success,
};

// ────────────────────────────────────────────────────────
// FAQ (관리자 API 통합명세서 v2.0 §22)
// ────────────────────────────────────────────────────────
export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: '계정',
  MATCHING: '매칭',
  DIARY: '일기',
  PAYMENT: '결제',
  ETC: '기타',
};

export const FAQ_CATEGORY_COLORS: Record<string, string> = {
  // 5종 — INQUIRY_CATEGORY와 일관된 토큰 매핑
  ACCOUNT: SOFT.info,
  MATCHING: SOFT.primary,
  DIARY: SOFT.accent,
  PAYMENT: SOFT.success,
  ETC: SOFT.muted,
};

// ────────────────────────────────────────────────────────
// 페이지네이션
// ────────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DEFAULT_PAGE_SIZE = 20;

// 커서 기반 기본 limit
export const DEFAULT_CURSOR_LIMIT = 20;
