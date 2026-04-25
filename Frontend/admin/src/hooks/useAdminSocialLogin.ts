import { useQuery } from '@tanstack/react-query';

import { adminSocialLoginApi } from '@/lib/api/adminSocialLogin';
import type { SocialErrorHistoryParams } from '@/types/socialAuth';

const KEY_STATS = 'admin-social-login-stats';
const KEY_HISTORY = 'admin-social-login-history';

/** 60초 폴링 — 실시간 모니터링 카드용. */
export function useSocialLoginStats(period: string = '1h') {
  return useQuery({
    queryKey: [KEY_STATS, period],
    queryFn: () =>
      adminSocialLoginApi.getStats(period).then((res) => res.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSocialLoginHistory(params: SocialErrorHistoryParams) {
  return useQuery({
    queryKey: [KEY_HISTORY, params],
    queryFn: () =>
      adminSocialLoginApi.getHistory(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}
