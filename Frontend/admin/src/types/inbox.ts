// 관리자 알림 센터 타입 정의 (BE: AdminInbox API, 명세 v2.3 §11.2)

export type NotificationType = 'CRITICAL' | 'WARN' | 'INFO';

export type NotificationStatus = 'UNREAD' | 'READ' | 'RESOLVED';

export type NotificationChannel = 'EMAIL' | 'SLACK' | 'IN_APP';

/**
 * 명세서에 정의된 카테고리 (확장 가능).
 * BE는 자유 문자열 컬럼으로 두지만 FE는 알려진 값을 enum화하여 한글 라벨 제공.
 */
export type NotificationCategory =
  | 'AI_MONITORING'
  | 'PIPELINE'
  | 'REPORT_SLA'
  | 'BATCH_FAILURE'
  | 'MANUAL'
  | 'ALL';

export interface AdminNotification {
  id: number;
  notificationType: NotificationType;
  category: string;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string | null;
  actionUrl: string | null;
  status: NotificationStatus;
  assignedTo: number | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  groupedCount: number;
  createdAt: string;
}

export interface AdminNotificationListResponse {
  items: AdminNotification[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  unreadCount: number;
}

export interface AdminNotificationListParams {
  notificationType?: NotificationType;
  category?: string;
  status?: NotificationStatus;
  assignedTo?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface AdminNotificationAssignRequest {
  assignedTo: number;
}

export interface AdminNotificationSubscriptionItem {
  category: string;
  alertLevel: NotificationType;
  channels: NotificationChannel[];
}

export interface AdminNotificationSubscriptionsResponse {
  subscriptions: AdminNotificationSubscriptionItem[];
}

export interface AdminNotificationSubscriptionsUpdateRequest {
  subscriptions: AdminNotificationSubscriptionItem[];
}
