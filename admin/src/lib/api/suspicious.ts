import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { SuspiciousAccount, SuspiciousAccountStatus, SuspicionType } from '@/types/user';

export const suspiciousApi = {
  // 의심 계정 검토 큐 조회
  getList: (params?: {
    status?: SuspiciousAccountStatus;
    suspicionType?: SuspicionType;
    sort?: string;
    page?: number;
    size?: number;
  }) =>
    apiClient.get<ApiResponse<PageResponse<SuspiciousAccount>>>('/api/admin/suspicious-accounts', { params }),

  // 의심 계정 탐지 상세
  getDetectionDetail: (accountId: number) =>
    apiClient.get<ApiResponse<SuspiciousAccount>>(`/api/admin/suspicious-accounts/${accountId}/detection-detail`),

  // 의심 계정 오탐 처리
  markFalsePositive: (accountId: number) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/suspicious-accounts/${accountId}/false-positive`),
};
