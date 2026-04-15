import apiClient from './client';
import type { ApiResponse, CursorResponse } from './types';
import type { Report, ReportSearchParams, ReportSummary } from '@/types/report';

// 기능명세서 기준: 커서 기반 페이지네이션
export const reportsApi = {
  // 9.1 신고 목록 (커서 기반, 우선순위 점수 정렬)
  getList: (params: ReportSearchParams) =>
    apiClient.get<ApiResponse<CursorResponse<Report>>>('/api/admin/reports', { params }),

  // 9.1 신고 요약 통계
  getSummary: () =>
    apiClient.get<ApiResponse<ReportSummary>>('/api/admin/reports/summary'),

  // 9.2 신고 상세
  getDetail: (reportId: number) =>
    apiClient.get<ApiResponse<Report>>(`/api/admin/reports/${reportId}`),

  // 9.2 신고 원본 콘텐츠 조회 (ADMIN+ only, PII 접근 로그)
  getContent: (reportId: number) =>
    apiClient.get<ApiResponse<{ content: string; contentType: string; deletedAt: string | null }>>(`/api/admin/reports/${reportId}/content`),

  // 9.2 신고 처리
  process: (reportId: number, data: { result: 'RESOLVED' | 'DISMISSED'; adminMemo: string; sanctionType?: 'NONE' | 'WARNING' | 'SUSPEND_7D' | 'BANNED' }) =>
    apiClient.patch<ApiResponse<null>>(`/api/admin/reports/${reportId}/process`, data),

  // 9.2 신고 담당자 배정
  assign: (reportId: number, data: { assigneeId: number; reason?: string }) =>
    apiClient.patch<ApiResponse<null>>(`/api/admin/reports/${reportId}/assign`, data),
};
