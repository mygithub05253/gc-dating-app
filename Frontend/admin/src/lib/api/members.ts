import apiClient from './client';
import type { ApiResponse, CursorResponse } from './types';
import type { AdminUserDetail, MemberSearchParams } from '@/types/user';

// 기능명세서 기준: /api/admin/members (커서 기반 페이지네이션)
export const membersApi = {
  // 7.1 회원 목록 조회 (커서 기반)
  getList: (params: MemberSearchParams) =>
    apiClient.get<ApiResponse<CursorResponse<AdminUserDetail>>>('/api/admin/members', { params }),

  // 7.2 회원 상세 조회
  getDetail: (userId: number) =>
    apiClient.get<ApiResponse<AdminUserDetail>>(`/api/admin/members/${userId}`),

  // 7.2 회원 활동 요약
  getActivitySummary: (userId: number) =>
    apiClient.get<ApiResponse<unknown>>(`/api/admin/members/${userId}/activity-summary`),

  // 7.4 회원 활동 타임라인
  getActivityTimeline: (userId: number, params?: { period?: string; cursor?: string; limit?: number }) =>
    apiClient.get<ApiResponse<unknown>>(`/api/admin/members/${userId}/activity-timeline`, { params }),

  // 7.2 제재/신고 이력 (ADMIN+ only)
  getSanctionHistory: (userId: number) =>
    apiClient.get<ApiResponse<unknown>>(`/api/admin/members/${userId}/sanction-history`),

  // 7.3 회원 제재 (memo 최소 10자)
  sanction: (userId: number, data: { type: '7DAY' | 'PERMANENT' | 'IMMEDIATE_PERMANENT'; memo: string }) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/members/${userId}/sanction`, data),

  // 7.3 회원 제재 해제 (SUPER_ADMIN only)
  liftSanction: (userId: number, reason: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/members/${userId}/sanction`, { data: { reason } }),
};
