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
export interface AdminProfile {
  adminId: number;
  email: string;
  name: string;
  role: AdminRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  lastLoginAt: string | null;
  createdAt: string;
}
