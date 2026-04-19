import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { SanctionAppeal, AppealSearchParams } from '@/types/support';

/**
 * 이의신청 관리 API.
 * 출처: 관리자_API_통합명세서_v2.0 §17.2
 *
 * ⚠ 백엔드 미구현 — 본 모듈은 Mock 환경에서만 호출 시그니처를 검증한다.
 */
export const appealsApi = {
  // 17.2.1 목록 조회 (VIEWER 이상)
  getList: (params: AppealSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<SanctionAppeal>>>(
      '/api/admin/sanction-appeals',
      { params },
    ),

  // 17.2.2 상세 조회 (VIEWER 이상)
  getDetail: (appealId: number) =>
    apiClient.get<ApiResponse<SanctionAppeal>>(
      `/api/admin/sanction-appeals/${appealId}`,
    ),

  // 17.2.3 수락 (ADMIN 이상) — 제재 자동 해제
  accept: (appealId: number, data: { resolution: string }) =>
    apiClient.post<ApiResponse<null>>(
      `/api/admin/sanction-appeals/${appealId}/accept`,
      data,
    ),

  // 17.2.4 기각 (ADMIN 이상)
  reject: (appealId: number, data: { resolution: string }) =>
    apiClient.post<ApiResponse<null>>(
      `/api/admin/sanction-appeals/${appealId}/reject`,
      data,
    ),
};
