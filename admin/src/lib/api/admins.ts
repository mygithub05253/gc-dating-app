import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type {
  AdminAccount,
  AdminAccountCreateRequest,
  AdminAccountUpdateRequest,
  AdminAccountSearchParams,
  AuditLog,
  AuditLogSearchParams,
  Permission,
  RolePermissions,
} from '@/types/admin';
import type { AdminRole } from '@/types/common';

// 기능명세서 기준: /api/admin/admins
export const adminsApi = {
  // 2.1 관리자 계정 목록 조회
  getList: (params?: AdminAccountSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<AdminAccount>>>('/api/admin/admins', { params }),

  // 2.3 관리자 계정 상세 조회
  getDetail: (adminId: number) =>
    apiClient.get<ApiResponse<AdminAccount>>(`/api/admin/admins/${adminId}`),

  // 2.2 관리자 계정 생성
  create: (data: AdminAccountCreateRequest) =>
    apiClient.post<ApiResponse<AdminAccount>>('/api/admin/admins', data),

  // 2.2 관리자 이메일 중복 확인
  checkEmail: (email: string) =>
    apiClient.get<ApiResponse<{ available: boolean }>>('/api/admin/admins/check-email', { params: { email } }),

  // 2.3 관리자 계정 수정
  update: (adminId: number, data: AdminAccountUpdateRequest) =>
    apiClient.put<ApiResponse<AdminAccount>>(`/api/admin/admins/${adminId}`, data),

  // 2.3 관리자 계정 삭제 (soft delete)
  delete: (adminId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/admins/${adminId}`),

  // 2.3 SUPER_ADMIN 활성 개수 조회
  countSuperAdmins: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/api/admin/admins/count-super-admins'),
};

// 기능명세서 기준: /api/admin/activity-logs
export const activityLogsApi = {
  // 2.5 관리자 활동 로그 조회
  getList: (params?: AuditLogSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<AuditLog>>>('/api/admin/activity-logs', { params }),

  // 2.5 관리자 활동 로그 CSV 내보내기 (최대 10,000건)
  export: (params?: AuditLogSearchParams) =>
    apiClient.get('/api/admin/activity-logs/export', { params, responseType: 'blob' }),
};

export const rbacApi = {
  // 2.4 전체 권한 목록 조회
  getPermissions: () =>
    apiClient.get<ApiResponse<Permission[]>>('/api/admin/rbac/permissions'),

  // 2.4 역할별 권한 현황 조회
  getRoles: () =>
    apiClient.get<ApiResponse<RolePermissions[]>>('/api/admin/rbac/roles'),

  // 2.4 역할별 권한 수정
  updateRole: (role: AdminRole, permissions: string[]) =>
    apiClient.put<ApiResponse<null>>(`/api/admin/rbac/roles/${role}`, { permissions }),
};
