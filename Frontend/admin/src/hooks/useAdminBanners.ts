import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { bannersApi } from '@/lib/api/banners';
import type { BannerCreateRequest, BannerSearchParams } from '@/lib/api/banners';

const KEY_LIST = 'admin-banners-list';
const KEY_DETAIL = 'admin-banners-detail';

export function useAdminBannersList(params: BannerSearchParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => bannersApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminBannerDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      bannersApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useCreateAdminBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BannerCreateRequest) => bannersApi.create(body),
    onSuccess: () => {
      toast.success('배너가 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<BannerCreateRequest> }) =>
      bannersApi.update(id, body),
    onSuccess: () => {
      toast.success('배너가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}

export function useDeleteAdminBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bannersApi.delete(id),
    onSuccess: () => {
      toast.success('배너가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
