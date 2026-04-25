import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  AdminNotification,
  AdminNotificationAssignRequest,
  AdminNotificationListParams,
  AdminNotificationListResponse,
  AdminNotificationSubscriptionsResponse,
  AdminNotificationSubscriptionsUpdateRequest,
} from '@/types/inbox';

/**
 * 관리자 알림 센터 API 클라이언트 (명세 v2.3 §11.2 / BE AdminInboxController).
 * 엔드포인트: /api/admin/notifications/*
 */
export const adminInboxApi = {
  // 목록 조회
  getList: (params?: AdminNotificationListParams) =>
    apiClient.get<ApiResponse<AdminNotificationListResponse>>(
      '/api/admin/notifications',
      { params },
    ),

  // 단건 상세
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<AdminNotification>>(`/api/admin/notifications/${id}`),

  // 읽음 처리
  markAsRead: (id: number) =>
    apiClient.patch<ApiResponse<AdminNotification>>(
      `/api/admin/notifications/${id}/read`,
    ),

  // 담당자 할당 (ADMIN+)
  assign: (id: number, body: AdminNotificationAssignRequest) =>
    apiClient.patch<ApiResponse<AdminNotification>>(
      `/api/admin/notifications/${id}/assign`,
      body,
    ),

  // 처리 완료 (ADMIN+)
  resolve: (id: number) =>
    apiClient.patch<ApiResponse<AdminNotification>>(
      `/api/admin/notifications/${id}/resolve`,
    ),

  // 구독 설정 조회
  getSubscriptions: () =>
    apiClient.get<ApiResponse<AdminNotificationSubscriptionsResponse>>(
      '/api/admin/notifications/subscriptions',
    ),

  // 구독 설정 일괄 수정
  updateSubscriptions: (body: AdminNotificationSubscriptionsUpdateRequest) =>
    apiClient.put<ApiResponse<AdminNotificationSubscriptionsResponse>>(
      '/api/admin/notifications/subscriptions',
      body,
    ),
};
