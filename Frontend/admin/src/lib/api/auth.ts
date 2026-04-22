import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  TokenResponse,
  AdminProfile,
  AdminSession,
  AdminActivityLog,
  Page,
} from '@/types/common';

interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  profileImageUrl?: string | null;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<TokenResponse>>('/api/admin/auth/login', data),

  logout: () => apiClient.post<ApiResponse<null>>('/api/admin/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<TokenResponse>>('/api/admin/auth/refresh', { refreshToken }),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    logoutOtherSessions?: boolean;
  }) => apiClient.put<ApiResponse<null>>('/api/admin/auth/password', data),

  // 현재 관리자 정보 조회 (API 통합명세서 v2.3 §1.5 확장)
  getMe: () => apiClient.get<ApiResponse<AdminProfile>>('/api/admin/auth/me'),

  // ── v2.3 확장 (Phase 3B) ─────────────────────────────────────────────────
  updateProfile: (data: ProfileUpdateRequest) =>
    apiClient.put<ApiResponse<AdminProfile>>('/api/admin/auth/profile', data),

  getSessions: () =>
    apiClient.get<ApiResponse<AdminSession[]>>('/api/admin/auth/sessions'),

  terminateSession: (sessionId: string) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/auth/sessions/${sessionId}`),

  getActivityLog: (params: { page: number; size: number }) =>
    apiClient.get<ApiResponse<Page<AdminActivityLog>>>('/api/admin/auth/activity-log', {
      params,
    }),
};
