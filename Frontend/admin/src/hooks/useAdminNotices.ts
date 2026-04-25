import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { noticesApi } from '@/lib/api/notices';
import type { NoticeCreateRequest, NoticeSearchParams, NoticeStatus } from '@/types/content';

const KEY_LIST = 'admin-notices-list';
const KEY_DETAIL = 'admin-notices-detail';

export function useAdminNoticesList(params: NoticeSearchParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => noticesApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminNoticeDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      noticesApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useCreateAdminNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NoticeCreateRequest) => noticesApi.create(body),
    onSuccess: () => {
      toast.success('공지사항이 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<NoticeCreateRequest> }) =>
      noticesApi.update(id, body),
    onSuccess: () => {
      toast.success('공지사항이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}

export function useChangeAdminNoticeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: NoticeStatus }) =>
      noticesApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success('공지사항 상태가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
