// 사용자 상태
export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  SUSPEND_7D: '7일 정지',
  BANNED: '영구 정지',
  PENDING_DELETION: '탈퇴 대기',
};

export const USER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPEND_7D: 'bg-yellow-100 text-yellow-800',
  BANNED: 'bg-red-100 text-red-800',
  PENDING_DELETION: 'bg-gray-100 text-gray-800',
};

// 신고 사유
export const REPORT_REASON_LABELS: Record<string, string> = {
  PROFANITY: '욕설/비방',
  OBSCENE: '음란물',
  PERSONAL_INFO: '개인정보 노출',
  FAKE: '허위 정보',
  SPAM: '스팸/광고',
  OTHER: '기타',
};

// 신고 상태
export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기 중',
  IN_PROGRESS: '처리 중',
  RESOLVED: '처리 완료',
  DISMISSED: '기각',
};

export const REPORT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
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
