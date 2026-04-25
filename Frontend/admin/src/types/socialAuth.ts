// 소셜 로그인 연동 이슈 타입 (BE: AdminSocialLoginController, 명세 v2.3 §7.6)

export type SocialErrorType =
  | 'TOKEN_EXPIRED'
  | 'PROVIDER_SERVER_ERROR'
  | 'USER_SOCIAL_ACCOUNT_DELETED'
  | 'APP_PERMISSION_REVOKED';

export type SocialResolutionStatus =
  | 'AUTO_RECOVERED'
  | 'USER_RELOGIN_REQUIRED'
  | 'MANUAL_INTERVENTION_REQUIRED';

export type SocialSeverity = 'NORMAL' | 'WARN' | 'CRITICAL';

export interface SocialErrorStats {
  provider: string;
  period: string;
  totalCount: number;
  affectedUserCount: number;
  errorTypeCounts: Record<SocialErrorType, number>;
  resolutionCounts: Record<SocialResolutionStatus, number>;
  errorRate: number | null;
  severity: SocialSeverity | null;
}

export interface SocialErrorLogItem {
  id: number;
  provider: string;
  errorType: SocialErrorType;
  errorCode: string | null;
  resolutionStatus: SocialResolutionStatus;
  userId: number | null;
  requestIp: string | null;
  occurredAt: string;
  errorMessage: string | null;
}

export interface SocialErrorHistoryResponse {
  items: SocialErrorLogItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface SocialErrorHistoryParams {
  provider?: string;
  errorType?: SocialErrorType;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}
