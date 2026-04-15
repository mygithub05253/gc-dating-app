import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  DashboardKPIResponse,
  DailyStats,
  MatchingStats,
  SummaryCategory,
} from '@/types/dashboard';

export const dashboardApi = {
  // 3.1 실시간 KPI 대시보드
  getKPI: (params?: { startDate?: string; endDate?: string; compareMode?: 'PREVIOUS_DAY' | 'PREVIOUS_WEEK' | 'PREVIOUS_MONTH' }) =>
    apiClient.get<ApiResponse<DashboardKPIResponse>>('/api/admin/dashboard/kpi', { params }),

  // 3.2 주요 지표 요약
  getSummary: (params?: { startDate?: string; endDate?: string; compareMode?: string }) =>
    apiClient.get<ApiResponse<SummaryCategory[]>>('/api/admin/dashboard/summary', { params }),

  // 3.2 주요 지표 내보내기
  exportSummary: (params?: { startDate?: string; endDate?: string; format?: 'CSV' | 'EXCEL' }) =>
    apiClient.get('/api/admin/dashboard/summary/export', { params, responseType: 'blob' }),

  // 일별 통계 (트렌드 차트용)
  getDailyStats: (startDate: string, endDate: string) =>
    apiClient.get<ApiResponse<DailyStats[]>>('/api/admin/dashboard/daily-stats', {
      params: { startDate, endDate },
    }),

  // 매칭 통계
  getMatchingStats: () =>
    apiClient.get<ApiResponse<MatchingStats>>('/api/admin/dashboard/matching-stats'),
};
