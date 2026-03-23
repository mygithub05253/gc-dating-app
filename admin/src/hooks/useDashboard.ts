import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';

export function useDashboardKPI() {
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: () => dashboardApi.getKPI().then((res) => res.data.data),
    refetchInterval: 60000, // 1분마다 갱신
  });
}

export function useDailyStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['dashboard', 'daily-stats', startDate, endDate],
    queryFn: () => dashboardApi.getDailyStats(startDate, endDate).then((res) => res.data.data),
    enabled: !!startDate && !!endDate,
  });
}

export function useMatchingStats() {
  return useQuery({
    queryKey: ['dashboard', 'matching-stats'],
    queryFn: () => dashboardApi.getMatchingStats().then((res) => res.data.data),
  });
}
