import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/lib/api/members';
import type { MemberSearchParams } from '@/types/user';
import toast from 'react-hot-toast';

export function useMemberList(params: MemberSearchParams) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: () => membersApi.getList(params).then((res) => res.data.data),
  });
}

export function useMemberDetail(id: number) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.getDetail(id).then((res) => res.data.data),
    enabled: !!id,
  });
}

// 7.3 회원 제재 (suspend / ban / immediateBan 분리 — API 통합명세서 v2.0 §3)
export function useSanctionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      type,
      memo,
    }: {
      id: number;
      type: '7DAY' | 'PERMANENT' | 'IMMEDIATE_PERMANENT';
      memo: string;
    }) => {
      if (type === '7DAY') return membersApi.suspend(id, { memo });
      if (type === 'IMMEDIATE_PERMANENT') return membersApi.immediateBan(id, { memo });
      return membersApi.ban(id, { memo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('회원이 제재되었습니다.');
    },
  });
}

// 7.7 회원 제재 해제 (SUPER_ADMIN only)
export function useReleaseSanction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      membersApi.releaseSanction(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('회원 제재가 해제되었습니다.');
    },
  });
}
