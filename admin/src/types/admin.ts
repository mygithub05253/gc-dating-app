import type { AdminRole } from './common';

// ─── 관리자 계정 ───
export type AdminAccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

export interface AdminAccount {
  id: number;
  email: string;
  adminName: string;
  adminRole: AdminRole;
  status: AdminAccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminAccountCreateRequest {
  email: string;
  password: string;
  adminName: string;
  adminRole: AdminRole;
}

export interface AdminAccountUpdateRequest {
  adminName?: string;
  adminRole?: AdminRole;
  status?: AdminAccountStatus;
}

export interface AdminAccountSearchParams {
  search?: string;
  role?: AdminRole;
  status?: AdminAccountStatus;
  page?: number;
  size?: number;
}

// ─── 감사 로그 ───
export interface AuditLog {
  id: number;
  adminId: number;
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogSearchParams {
  adminId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
}

// ─── RBAC ───
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  role: AdminRole;
  permissions: string[];
}
