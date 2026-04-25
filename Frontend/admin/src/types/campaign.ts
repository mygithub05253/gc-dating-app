// 일괄 공지/푸시 캠페인 타입 정의 (BE: NotificationCampaignController, 명세 v2.3 §11.1.3)

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type SendType = 'NOTICE' | 'PUSH' | 'EMAIL';

/**
 * 발송 대상 필터 조건. 모든 필드 nullable, AND 결합.
 */
export interface CampaignFilterConditions {
  signedUpAfter?: string | null;
  signedUpBefore?: string | null;
  lastActiveAfter?: string | null;
  lastActiveBefore?: string | null;
  hasMatched?: boolean | null;
  aiConsent?: boolean | null;
  genders?: string[] | null;
}

export interface NotificationCampaign {
  id: number;
  title: string;
  messageSubject: string;
  messageBody: string;
  filterConditions: CampaignFilterConditions;
  sendTypes: SendType[];
  scheduledAt: string | null;
  status: CampaignStatus;
  targetCount: number;
  successCount: number;
  failureCount: number;
  sentAt: string | null;
  completedAt: string | null;
  createdBy: number;
  createdAt: string;
  modifiedAt: string;
}

export interface CampaignListResponse {
  items: NotificationCampaign[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface CampaignListParams {
  status?: CampaignStatus;
  createdBy?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface CampaignCreateRequest {
  title: string;
  messageSubject: string;
  messageBody: string;
  filterConditions: CampaignFilterConditions;
  sendTypes: SendType[];
  scheduledAt?: string | null;
}

export interface CampaignPreviewRequest {
  filterConditions: CampaignFilterConditions;
}

export interface CampaignPreviewResponse {
  targetCount: number;
  preview: string;
}

export interface CampaignChannelResult {
  sendType: SendType;
  successCount: number;
  failureCount: number;
}

export interface CampaignResultResponse {
  campaignId: number;
  status: CampaignStatus;
  targetCount: number;
  successCount: number;
  failureCount: number;
  channelResults: CampaignChannelResult[];
  openedCount: number;
  clickedCount: number;
  openRate: number | null;
  clickRate: number | null;
}
