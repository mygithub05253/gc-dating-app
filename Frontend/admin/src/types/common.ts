export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

export interface AdminUser {
  adminId: number;
  email: string;
  role: AdminRole;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  role: AdminRole;
  adminId: number;
  email: string;
}

// 현재 로그인한 관리자 프로필 (GET /api/admin/auth/me 응답)
// v2.3 확장 (Phase 3B): profileImageUrl, passwordLastChangedAt 추가
export interface AdminProfile {
  adminId: number;
  email: string;
  name: string;
  role: AdminRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  lastLoginAt: string | null;
  passwordLastChangedAt: string | null;
  profileImageUrl: string | null;
  createdAt?: string;
}

// 관리자 세션 (GET /api/admin/auth/sessions)
export interface AdminSession {
  sessionId: string;
  device: string | null;
  ipAddress: string | null;
  issuedAt: string | null;
  current: boolean;
}

// 관리자 활동 로그 (GET /api/admin/auth/activity-log)
export interface AdminActivityLog {
  occurredAt: string;
  actionType: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE';
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
}

// 페이징 응답 (Spring Page)
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
