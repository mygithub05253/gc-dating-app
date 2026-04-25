import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  CampaignCreateRequest,
  CampaignListParams,
  CampaignListResponse,
  CampaignPreviewRequest,
  CampaignPreviewResponse,
  CampaignResultResponse,
  NotificationCampaign,
} from '@/types/campaign';

/**
 * 일괄 공지/푸시 캠페인 API 클라이언트.
 * BE: NotificationCampaignController (/api/admin/notification-campaigns/*)
 * 명세 v2.3 §11.1.3 Step 6.
 */
export const adminCampaignsApi = {
  // 목록 (VIEWER+)
  getList: (params?: CampaignListParams) =>
    apiClient.get<ApiResponse<CampaignListResponse>>(
      '/api/admin/notification-campaigns',
      { params },
    ),

  // 단건 (VIEWER+)
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<NotificationCampaign>>(
      `/api/admin/notification-campaigns/${id}`,
    ),

  // 생성 (ADMIN+) — DRAFT 상태로 저장
  create: (body: CampaignCreateRequest) =>
    apiClient.post<ApiResponse<NotificationCampaign>>(
      '/api/admin/notification-campaigns',
      body,
    ),

  // 미리보기 (ADMIN+) — 대상 수만 반환 (개인정보 보호)
  preview: (body: CampaignPreviewRequest) =>
    apiClient.post<ApiResponse<CampaignPreviewResponse>>(
      '/api/admin/notification-campaigns/preview',
      body,
    ),

  // 발송 승인 (ADMIN+) — DRAFT → SCHEDULED 또는 SENDING
  approve: (id: number) =>
    apiClient.post<ApiResponse<NotificationCampaign>>(
      `/api/admin/notification-campaigns/${id}/approve`,
    ),

  // 예약 취소 (ADMIN+) — SCHEDULED만 가능
  cancel: (id: number) =>
    apiClient.post<ApiResponse<NotificationCampaign>>(
      `/api/admin/notification-campaigns/${id}/cancel`,
    ),

  // 결과 조회 (VIEWER+) — 채널별 성공/실패, 열람률, 클릭률
  getResult: (id: number) =>
    apiClient.get<ApiResponse<CampaignResultResponse>>(
      `/api/admin/notification-campaigns/${id}/result`,
    ),
};
