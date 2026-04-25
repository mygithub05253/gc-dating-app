import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  SocialErrorHistoryParams,
  SocialErrorHistoryResponse,
  SocialErrorStats,
} from '@/types/socialAuth';

/**
 * 소셜 로그인 연동 이슈 관리 API 클라이언트.
 * BE: AdminSocialLoginController (/api/admin/social-login/*)
 * 명세 v2.3 §7.6 Step 6.
 */
export const adminSocialLoginApi = {
  // 실시간 오류 통계 (ADMIN+)
  getStats: (period: string = '1h') =>
    apiClient.get<ApiResponse<SocialErrorStats>>(
      '/api/admin/social-login/error-stats',
      { params: { period } },
    ),

  // 오류 이력 조회 (ADMIN+)
  getHistory: (params?: SocialErrorHistoryParams) =>
    apiClient.get<ApiResponse<SocialErrorHistoryResponse>>(
      '/api/admin/social-login/error-history',
      { params },
    ),
};
