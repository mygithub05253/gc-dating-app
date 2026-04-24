// AI 모니터링 대시보드 React Query 훅 — Phase 3B §12.
// 백엔드 /api/admin/monitoring/** 및 /api/admin/consent/** 계약과 1:1 매핑.
// 30초 auto-refresh 폴링 기본 적용.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/monitoring';

const AUTO_REFRESH_MS = 30_000;

// ─── 조회 훅 ────────────────────────────────────────────────────────────────

export function useAiOverview() {
  return useQuery({
    queryKey: ['monitoring', 'ai', 'overview'],
    queryFn: () => monitoringApi.getAiOverview().then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

export function useConsentStats(range: '24h' | '7d' | '30d' = '7d') {
  return useQuery({
    queryKey: ['monitoring', 'ai', 'consent-stats', range],
    queryFn: () => monitoringApi.getConsentStats(range).then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

export function useMqStatus() {
  return useQuery({
    queryKey: ['monitoring', 'mq', 'status'],
    queryFn: () => monitoringApi.getMqStatus().then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

export function useOutboxStatus() {
  return useQuery({
    queryKey: ['monitoring', 'outbox', 'status'],
    queryFn: () => monitoringApi.getOutboxStatus().then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

export function useRedisHealth() {
  return useQuery({
    queryKey: ['monitoring', 'redis', 'health'],
    queryFn: () => monitoringApi.getRedisHealth().then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

export function useAnalysisOverview() {
  return useQuery({
    queryKey: ['monitoring', 'analysis', 'overview'],
    queryFn: () => monitoringApi.getAnalysisOverview().then((res) => res.data.data),
    refetchInterval: AUTO_REFRESH_MS,
  });
}

// AI 동의 미동의 사용자 목록 (페이지네이션)
export function useConsentMissingUsers(params: {
  page: number;
  size: number;
  filter: 'NO_AI_ANALYSIS' | 'NO_MATCHING';
}) {
  return useQuery({
    queryKey: ['monitoring', 'consent', 'missing-users', params],
    queryFn: () => monitoringApi.getConsentMissingUsers(params).then((res) => res.data.data),
  });
}

// ─── SUPER_ADMIN 액션 mutation ─────────────────────────────────────────────

export function useReprocessDlq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueName: string) => monitoringApi.reprocessDlq(queueName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'mq'] });
      qc.invalidateQueries({ queryKey: ['monitoring', 'ai', 'overview'] });
    },
  });
}

export function useRetryOutbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventIds?: number[]) => monitoringApi.retryOutbox(eventIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'outbox'] });
      qc.invalidateQueries({ queryKey: ['monitoring', 'ai', 'overview'] });
    },
  });
}

export function useForceFailDiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ diaryId, reason }: { diaryId: number; reason: string }) =>
      monitoringApi.forceFailDiary(diaryId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', 'analysis'] });
    },
  });
}

export function useConsentRemind() {
  return useMutation({
    mutationFn: (reportId: number) => monitoringApi.consentRemind(reportId),
  });
}
