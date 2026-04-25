import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { adminInboxApi } from '@/lib/api/adminInbox';
import type {
  AdminNotificationListParams,
  AdminNotificationSubscriptionsUpdateRequest,
} from '@/types/inbox';

const KEY_LIST = 'admin-inbox-list';
const KEY_DETAIL = 'admin-inbox-detail';
const KEY_SUBSCRIPTIONS = 'admin-inbox-subscriptions';

/** 미읽음 카운터 폴링용 짧은 키 (Header 알림 뱃지에서 사용). */
const KEY_UNREAD_BADGE = 'admin-inbox-unread';

/**
 * 알림 목록 조회.
 * staleTime 30초 — 자동 refetch 부담 최소화.
 */
export function useAdminInboxList(params: AdminNotificationListParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => adminInboxApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useAdminInboxDetail(id: number | null) {
  return useQuery({
    queryKey: [KEY_DETAIL, id],
    queryFn: () => adminInboxApi.getDetail(id as number).then((res) => res.data.data),
    enabled: id !== null,
  });
}

/**
 * Header 알림 뱃지용 미읽음 카운트만 가벼운 폴링으로 가져온다.
 * size=1로 응답 페이로드를 최소화. 60초 주기.
 */
export function useAdminInboxUnreadCount() {
  return useQuery({
    queryKey: [KEY_UNREAD_BADGE],
    queryFn: () =>
      adminInboxApi
        .getList({ size: 1, status: 'UNREAD' })
        .then((res) => res.data.data.unreadCount),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkAdminInboxRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminInboxApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [KEY_UNREAD_BADGE] });
    },
  });
}

export function useAssignAdminInbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number }) =>
      adminInboxApi.assign(id, { assignedTo }),
    onSuccess: () => {
      toast.success('담당자가 할당되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [KEY_UNREAD_BADGE] });
    },
  });
}

export function useResolveAdminInbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminInboxApi.resolve(id),
    onSuccess: () => {
      toast.success('알림을 처리 완료 상태로 변경했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
      queryClient.invalidateQueries({ queryKey: [KEY_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [KEY_UNREAD_BADGE] });
    },
  });
}

export function useAdminInboxSubscriptions() {
  return useQuery({
    queryKey: [KEY_SUBSCRIPTIONS],
    queryFn: () => adminInboxApi.getSubscriptions().then((res) => res.data.data),
  });
}

export function useUpdateAdminInboxSubscriptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminNotificationSubscriptionsUpdateRequest) =>
      adminInboxApi.updateSubscriptions(body),
    onSuccess: () => {
      toast.success('알림 구독 설정을 저장했습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_SUBSCRIPTIONS] });
    },
  });
}
