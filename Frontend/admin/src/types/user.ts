export type UserStatus = 'ACTIVE' | 'SUSPEND_7D' | 'BANNED' | 'WITHDRAWN';
export type UserRole = 'ROLE_USER' | 'ROLE_GUEST';
export type Gender = 'M' | 'F';

// 의심 계정 관련
export type SuspicionType = 'BOT' | 'FAKE_PROFILE' | 'SPAM' | 'MULTI_ACCOUNT' | 'SCAM';
export type SuspiciousAccountStatus = 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'CLEARED';

export interface AdminUserDetail {
  id: number;
  nickname: string;
  realName: string;
  email: string;
  gender: Gender;
  birthDate: string;
  region: string;
  school: string;
  status: UserStatus;
  role: UserRole;
  isProfileCompleted: boolean;
  createdAt: string;
  modifiedAt: string;
  lastLoginAt: string;
  socialProvider: string;
  // 활동 요약
  diaryCount: number;
  matchCount: number;
  reportCount: number;
  exchangeRoomCount: number;
  // AI 분석
  personalityKeywords: string[];
  // 최근 일기
  recentDiaries: RecentDiary[];
  // 신고 이력
  reportHistory: UserReportHistory[];
  // 제재 정보 (정지 상태일 때)
  suspendReason?: string;
  suspendUntil?: string;
}

export interface RecentDiary {
  id: number;
  title: string;
  createdAt: string;
}

export interface UserReportHistory {
  id: number;
  reason: string;
  status: string;
  createdAt: string;
}

export interface SuspiciousAccount {
  id: number;
  userId: number;
  nickname: string;
  email: string;
  signupDate: string;
  suspicionType: SuspicionType;
  riskScore: number;
  indicators: string[];
  status: SuspiciousAccountStatus;
  detectedAt: string;
  lastActivity: string;
  activityCount: number;
}

// 기능명세서 기준 커서 기반 검색 파라미터
export interface MemberSearchParams {
  cursor?: string;
  limit?: number;
  status?: UserStatus;
  gender?: Gender;
  nickname?: string;
  email?: string;
  signupDateFrom?: string;
  signupDateTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  socialProvider?: string;
  sortBy?: string;
}
