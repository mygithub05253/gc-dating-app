export type UserStatus = 'ACTIVE' | 'SUSPEND_7D' | 'BANNED' | 'PENDING_DELETION';
export type UserRole = 'ROLE_USER' | 'ROLE_GUEST';
export type Gender = 'MALE' | 'FEMALE';

export interface AdminUserDetail {
  id: number;
  nickname: string;
  realName: string;
  gender: Gender;
  birthDate: string;
  region: string;
  school: string;
  status: UserStatus;
  role: UserRole;
  isProfileCompleted: boolean;
  createdAt: string;
  modifiedAt: string;
  // 활동 요약
  diaryCount: number;
  matchCount: number;
  reportCount: number;
  lastLoginAt: string;
}

export interface UserSearchParams {
  keyword?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}
