import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { tutorialsApi } from '@/lib/api/tutorials';
import type { TutorialCreateRequest, TutorialSearchParams } from '@/lib/api/tutorials';

const KEY_LIST = 'admin-tutorials-list';
const KEY_DETAIL = 'admin-tutorials-detail';

export function useAdminTutorialsList(params: TutorialSearchParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => tutorialsApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminTutorialDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      tutorialsApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useCreateAdminTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TutorialCreateRequest) => tutorialsApi.create(body),
    onSuccess: () => {
      toast.success('튜토리얼이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<TutorialCreateRequest> }) =>
      tutorialsApi.update(id, body),
    onSuccess: () => {
      toast.success('튜토리얼이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}

export function useDeleteAdminTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tutorialsApi.delete(id),
    onSuccess: () => {
      toast.success('튜토리얼이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
