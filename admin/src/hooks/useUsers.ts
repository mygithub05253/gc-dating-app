import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import type { UserSearchParams } from '@/types/user';
import toast from 'react-hot-toast';

export function useUserList(params: UserSearchParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getList(params).then((res) => res.data.data),
  });
}

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getDetail(id).then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      usersApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('사용자가 정지되었습니다.');
    },
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      usersApi.ban(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('사용자가 영구 정지되었습니다.');
    },
  });
}

export function useUnsuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersApi.unsuspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('사용자 정지가 해제되었습니다.');
    },
  });
}
