import apiClient from './client';
import type { ApiResponse } from './types';
import type { SocialAuthIssue, SocialAuthStats, SocialAuthErrorHistory } from '@/types/system';

export const socialAuthApi = {
  // 소셜 로그인 오류 현황
  getIssues: () =>
    apiClient.get<ApiResponse<SocialAuthIssue[]>>('/api/admin/social-auth/issues'),

  // 소셜 로그인 성공/실패율
  getStats: () =>
    apiClient.get<ApiResponse<SocialAuthStats[]>>('/api/admin/social-auth/stats'),

  // 오류 이력 조회
  getErrorHistory: (params?: { provider?: string; period?: string }) =>
    apiClient.get<ApiResponse<SocialAuthErrorHistory[]>>('/api/admin/social-auth/error-history', { params }),
};
