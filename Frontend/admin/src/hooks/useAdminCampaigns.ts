import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { adminCampaignsApi } from '@/lib/api/adminCampaigns';
import type {
  CampaignCreateRequest,
  CampaignListParams,
  CampaignPreviewRequest,
} from '@/types/campaign';

const KEY_LIST = 'admin-campaigns-list';
const KEY_DETAIL = 'admin-campaigns-detail';
const KEY_RESULT = 'admin-campaigns-result';

export function useAdminCampaignsList(params: CampaignListParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => adminCampaignsApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminCampaignDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () =>
      adminCampaignsApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useAdminCampaignResult(id: number | null) {
  return useQuery({
    queryKey: [KEY_RESULT, id],
    queryFn: () =>
      adminCampaignsApi.getResult(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useCreateAdminCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignCreateRequest) => adminCampaignsApi.create(body),
    onSuccess: () => {
      toast.success('캠페인을 DRAFT 상태로 생성했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

/** 미리보기는 mutation으로 호출하면 폼 입력 직후 onClick으로 실행하기 편하다. */
export function usePreviewAdminCampaign() {
  return useMutation({
    mutationFn: (body: CampaignPreviewRequest) =>
      adminCampaignsApi.preview(body).then((res) => res.data.data),
  });
}

export function useApproveAdminCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminCampaignsApi.approve(id),
    onSuccess: () => {
      toast.success('캠페인 발송을 승인했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}

export function useCancelAdminCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminCampaignsApi.cancel(id),
    onSuccess: () => {
      toast.success('예약을 취소했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
    },
  });
}
