import apiClient from './client';
import type { ApiResponse } from './types';
import type { DashboardKPI, DailyStats, MatchingStats } from '@/types/dashboard';

export const dashboardApi = {
  getKPI: () => apiClient.get<ApiResponse<DashboardKPI>>('/api/admin/dashboard/kpi'),

  getDailyStats: (startDate: string, endDate: string) =>
    apiClient.get<ApiResponse<DailyStats[]>>('/api/admin/dashboard/daily-stats', {
      params: { startDate, endDate },
    }),

  getMatchingStats: () =>
    apiClient.get<ApiResponse<MatchingStats>>('/api/admin/dashboard/matching-stats'),
};
