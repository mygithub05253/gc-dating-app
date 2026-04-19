import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Report, ReportSearchParams, ReportSummary } from '@/types/report';

// API 통합명세서 v2.0 기준: PageResponse 기반
export const reportsApi = {
  // 9.1 신고 목록 (우선순위 점수 정렬)
  getList: (params: ReportSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Report>>>('/api/admin/reports', { params }),

  // 9.1 신고 요약 통계
  getSummary: () =>
    apiClient.get<ApiResponse<ReportSummary>>('/api/admin/reports/summary'),

  // 9.2 신고 상세
  getDetail: (reportId: number) =>
    apiClient.get<ApiResponse<Report>>(`/api/admin/reports/${reportId}`),

  // 9.2 신고 원본 콘텐츠 조회 (ADMIN+, PII 접근 로그)
  getContent: (reportId: number) =>
    apiClient.get<ApiResponse<{ content: string; contentType: string; deletedAt: string | null }>>(
      `/api/admin/reports/${reportId}/content`,
    ),

  // 9.2 신고 맥락 조회 (대화/일기 컨텍스트)
  getContext: (reportId: number) =>
    apiClient.get<ApiResponse<unknown>>(`/api/admin/reports/${reportId}/context`),

  // 9.2 신고 처리 완료 (ADMIN+, memo 최소 10자)
  resolve: (
    reportId: number,
    data: {
      adminMemo: string;
      sanctionType?: 'NONE' | 'WARNING' | 'SUSPEND_7D' | 'BANNED';
    },
  ) => apiClient.post<ApiResponse<null>>(`/api/admin/reports/${reportId}/resolve`, data),

  // 9.2 신고 기각 (ADMIN+)
  dismiss: (reportId: number, data: { adminMemo: string }) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/reports/${reportId}/dismiss`, data),

  // 9.2 신고 담당자 배정
  assign: (reportId: number, data: { assigneeId: number; reason?: string }) =>
    apiClient.patch<ApiResponse<null>>(`/api/admin/reports/${reportId}/assign`, data),
};
