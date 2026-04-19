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
  ACTIVE: 'bg-green-100 text-green-800',
  GUEST: 'bg-slate-100 text-slate-700',
  SUSPEND_7D: 'bg-yellow-100 text-yellow-800',
  SUSPEND_30D: 'bg-orange-100 text-orange-800',
  BANNED: 'bg-red-100 text-red-800',
  DEACTIVATED: 'bg-gray-100 text-gray-800',
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
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-800',
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
  GENERAL: 'bg-slate-100 text-slate-700',
  MAINTENANCE: 'bg-blue-100 text-blue-700',
  TERMS_CHANGE: 'bg-purple-100 text-purple-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const NOTICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  PUBLISHED: '게시',
  HIDDEN: '숨김',
};

export const NOTICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  HIDDEN: 'bg-zinc-100 text-zinc-500',
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
  PENDING: 'bg-yellow-100 text-yellow-800',
  INVESTIGATING: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-red-100 text-red-800',
  CLEARED: 'bg-gray-100 text-gray-800',
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
  PROFANITY: 'bg-orange-100 text-orange-700',
  SEXUAL: 'bg-pink-100 text-pink-700',
  DISCRIMINATION: 'bg-red-100 text-red-700',
  ETC: 'bg-gray-100 text-gray-700',
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
  ACCOUNT: 'bg-blue-100 text-blue-800',
  MATCHING: 'bg-pink-100 text-pink-800',
  EXCHANGE: 'bg-purple-100 text-purple-800',
  CHAT: 'bg-cyan-100 text-cyan-800',
  PAYMENT: 'bg-green-100 text-green-800',
  BUG: 'bg-red-100 text-red-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  OPEN: '대기 중',
  IN_PROGRESS: '처리 중',
  RESOLVED: '답변 완료',
  CLOSED: '종료',
};

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
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
  PENDING: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-700',
};

export const SANCTION_TYPE_LABELS: Record<string, string> = {
  WARNING: '경고',
  SUSPEND_7D: '7일 정지',
  SUSPEND_30D: '30일 정지',
  BANNED: '영구 정지',
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
  ACCOUNT: 'bg-blue-100 text-blue-700',
  MATCHING: 'bg-pink-100 text-pink-700',
  DIARY: 'bg-purple-100 text-purple-700',
  PAYMENT: 'bg-green-100 text-green-700',
  ETC: 'bg-gray-100 text-gray-700',
};

// ────────────────────────────────────────────────────────
// 페이지네이션
// ────────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DEFAULT_PAGE_SIZE = 20;

// 커서 기반 기본 limit
export const DEFAULT_CURSOR_LIMIT = 20;
