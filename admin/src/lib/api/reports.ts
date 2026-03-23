import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Report, ReportSearchParams } from '@/types/report';

export const reportsApi = {
  getList: (params: ReportSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Report>>>('/api/admin/reports', { params }),

  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Report>>(`/api/admin/reports/${id}`),

  resolve: (id: number, action: string, note: string) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/reports/${id}/resolve`, { action, note }),

  dismiss: (id: number, reason: string) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/reports/${id}/dismiss`, { reason }),
};
