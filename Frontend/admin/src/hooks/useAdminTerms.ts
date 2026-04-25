import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { termsApi } from '@/lib/api/terms';
import type { TermsCreateRequest, TermsSearchParams } from '@/types/content';

const KEY_LIST = 'admin-terms-list';
const KEY_DETAIL = 'admin-terms-detail';
const KEY_HISTORY = 'admin-terms-history';

export function useAdminTermsList(params: TermsSearchParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => termsApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminTermsDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      termsApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useAdminTermsHistory() {
  return useQuery({
    queryKey: [KEY_HISTORY],
    queryFn: () => termsApi.getHistory().then((res) => res.data.data),
    staleTime: 60_000,
  });
}

export function useCreateAdminTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TermsCreateRequest) => termsApi.create(body),
    onSuccess: () => {
      toast.success('약관이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<TermsCreateRequest> }) =>
      termsApi.update(id, body),
    onSuccess: () => {
      toast.success('약관이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [KEY_HISTORY] });
    },
  });
}

export function useDeleteAdminTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => termsApi.delete(id),
    onSuccess: () => {
      toast.success('약관이 비활성화되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
