// 사용자 상태 (기능명세서 기준)
export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  SUSPEND_7D: '7일 정지',
  BANNED: '영구 정지',
  WITHDRAWN: '탈퇴 예정',
};

export const USER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPEND_7D: 'bg-yellow-100 text-yellow-800',
  BANNED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
};

// 성별 (기능명세서 기준: M/F)
export const GENDER_LABELS: Record<string, string> = {
  M: '남성',
  F: '여성',
};

// 신고 사유
export const REPORT_REASON_LABELS: Record<string, string> = {
  PROFANITY: '욕설/비방',
  OBSCENE: '음란물',
  PERSONAL_INFO: '개인정보 노출',
  HARASSMENT: '괴롭힘',
  FAKE_PROFILE: '허위 프로필',
  SPAM: '스팸/광고',
  OTHER: '기타',
};

// 신고 상태 (기능명세서 기준: UNDER_REVIEW)
export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  UNDER_REVIEW: '검토 중',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
};

export const REPORT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-800',
};

// 관리자 역할
export const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '최고 관리자',
  ADMIN: '관리자',
  VIEWER: '뷰어',
};

// 페이지 사이즈 옵션
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DEFAULT_PAGE_SIZE = 20;

// 커서 기반 기본 limit
export const DEFAULT_CURSOR_LIMIT = 20;
