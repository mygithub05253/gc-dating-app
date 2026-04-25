import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { keywordsApi } from '@/lib/api/keywords';
import type {
  KeywordBulkWeightRequest,
  KeywordCreateRequest,
  KeywordListParams,
  KeywordUpdateRequest,
} from '@/types/keyword';

const KEY_LIST = 'admin-keywords-list';
const KEY_DETAIL = 'admin-keywords-detail';

export function useAdminKeywordsList(params: KeywordListParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => keywordsApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminKeywordDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      keywordsApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useCreateAdminKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: KeywordCreateRequest) => keywordsApi.create(body),
    onSuccess: () => {
      toast.success('키워드가 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: KeywordUpdateRequest }) =>
      keywordsApi.update(id, body),
    onSuccess: () => {
      toast.success('키워드가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}

export function useDeleteAdminKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => keywordsApi.delete(id),
    onSuccess: () => {
      toast.success('키워드가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useBulkUpdateKeywordWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: KeywordBulkWeightRequest) => keywordsApi.bulkUpdateWeight(body),
    onSuccess: () => {
      toast.success('키워드 가중치가 일괄 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
