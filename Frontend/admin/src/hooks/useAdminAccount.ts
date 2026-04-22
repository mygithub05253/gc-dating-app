// 관리자 '내 계정' React Query 훅 — Phase 3B §1 확장.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type ProfileUpdateRequest } from '@/lib/api/auth';

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin', 'auth', 'me'],
    queryFn: () => authApi.getMe().then((res) => res.data.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileUpdateRequest) => authApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'auth', 'me'] });
    },
  });
}

export function useAdminSessions() {
  return useQuery({
    queryKey: ['admin', 'auth', 'sessions'],
    queryFn: () => authApi.getSessions().then((res) => res.data.data),
  });
}

export function useTerminateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => authApi.terminateSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'auth', 'sessions'] });
    },
  });
}

export function useAdminActivityLog(page = 0, size = 20) {
  return useQuery({
    queryKey: ['admin', 'auth', 'activity-log', page, size],
    queryFn: () => authApi.getActivityLog({ page, size }).then((res) => res.data.data),
  });
}
