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
