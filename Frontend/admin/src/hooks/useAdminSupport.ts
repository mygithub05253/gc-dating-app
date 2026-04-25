import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { adminSupportApi } from '@/lib/api/adminSupport';
import type { InquirySearchParams, AppealSearchParams } from '@/types/support';

const KEY_INQUIRIES = 'admin-support-inquiries';
const KEY_INQUIRY_DETAIL = 'admin-support-inquiry-detail';
const KEY_APPEALS = 'admin-support-appeals';
const KEY_APPEAL_DETAIL = 'admin-support-appeal-detail';

// ── 문의 관리 ─────────────────────────────────────────────

export function useAdminInquiries(params: InquirySearchParams) {
  return useQuery({
    queryKey: [KEY_INQUIRIES, params],
    queryFn: () => adminSupportApi.getInquiries(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminInquiryDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_INQUIRY_DETAIL, id],
    queryFn: () =>
      adminSupportApi.getInquiry(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useReplyInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer }: { id: number; answer: string }) =>
      adminSupportApi.replyInquiry(id, answer),
    onSuccess: () => {
      toast.success('답변이 전송되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_INQUIRIES] });
      queryClient.invalidateQueries({ queryKey: [KEY_INQUIRY_DETAIL] });
    },
    onError: () => {
      toast.error('답변 전송에 실패했습니다.');
    },
  });
}

export function useCloseInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminSupportApi.closeInquiry(id),
    onSuccess: () => {
      toast.success('문의를 종료했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_INQUIRIES] });
      queryClient.invalidateQueries({ queryKey: [KEY_INQUIRY_DETAIL] });
    },
    onError: () => {
      toast.error('문의 종료에 실패했습니다.');
    },
  });
}

// ── 이의신청 관리 ─────────────────────────────────────────

export function useAdminAppeals(params: AppealSearchParams) {
  return useQuery({
    queryKey: [KEY_APPEALS, params],
    queryFn: () => adminSupportApi.getAppeals(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminAppealDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_APPEAL_DETAIL, id],
    queryFn: () =>
      adminSupportApi.getAppeal(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

export function useResolveAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      decisionReason,
    }: {
      id: number;
      decision: string;
      decisionReason: string;
    }) => adminSupportApi.resolveAppeal(id, decision, decisionReason),
    onSuccess: () => {
      toast.success('이의신청이 처리되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_APPEALS] });
      queryClient.invalidateQueries({ queryKey: [KEY_APPEAL_DETAIL] });
    },
    onError: () => {
      toast.error('이의신청 처리에 실패했습니다.');
    },
  });
}
