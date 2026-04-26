// 신고 사유 (ERD v2.0 기준 7종)
export type ReportReason =
  | 'PROFANITY'
  | 'SEXUAL'
  | 'PERSONAL_INFO'
  | 'SPAM'
  | 'IMPERSONATION'
  | 'HARASSMENT'
  | 'OTHER';

// 신고 상태 (ERD v2.0 기준)
export type ReportStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

// SLA 상태 (API v2.1 신규, 서버 계산 라벨)
export type SlaStatus = 'ON_TRACK' | 'WARNING' | 'OVERDUE';

// 제재 유형 (ERD v2.1 sanction_history.sanction_type 정합, 사용자 명세서 11.4 5종)
export type SanctionType =
  | 'WARNING'
  | 'SUSPEND_7D'
  | 'SUSPEND_30D'
  | 'SUSPEND_PERMANENT'
  | 'FORCE_WITHDRAW'
  | 'UNBLOCK';

// 기능명세서 기준 심각도 가중치
export const REPORT_SEVERITY_WEIGHTS: Record<string, number> = {
  SEXUAL: 5,         // 성적 콘텐츠
  PERSONAL_INFO: 4,  // 개인정보 노출
  HARASSMENT: 3,     // 괴롭힘
  SPAM: 2,           // 스팸
  PROFANITY: 2,      // 욕설
  IMPERSONATION: 2,  // 사칭/허위 프로필
  OTHER: 1,          // 기타
};

// 차단 관련
export type BlockStatus = 'ACTIVE' | 'UNBLOCKED' | 'ADMIN_CANCELLED';
export type BlockReason = 'HARASSMENT' | 'SPAM' | 'INAPPROPRIATE' | 'OFFENSIVE' | 'OTHER';

// 외부 연락처 탐지
export type ContactPatternType = 'PHONE' | 'EMAIL' | 'KAKAO' | 'INSTAGRAM' | 'LINK';
export type ContactDetectionStatus = 'PENDING' | 'CONFIRMED' | 'FALSE_POSITIVE';

// SLA 기준 (기능명세서)
export const SLA_HOURS = {
  SEVERE: 24,  // 심각 신고 (성적, 개인정보)
  GENERAL: 72, // 일반 신고
};

export interface Report {
  id: number;
  reporterId: number;
  reporterNickname: string;
  reporterEmail: string;
  targetId: number;
  targetNickname: string;
  targetEmail: string;
  reason: ReportReason;
  detail: string;
  evidenceContent: string;
  status: ReportStatus;
  // 우선순위 & SLA (기능명세서 9.1, ERD v2.1 필드 정합)
  priorityScore: number; // 0~100
  slaDeadline: string;
  slaProgress: number; // 0~1 (1이면 초과)
  slaStatus: SlaStatus; // API v2.1 신규: 서버 계산 라벨
  assignedTo: number | null; // ERD v2.1: admin_accounts.id
  assignedAdminName: string | null; // API v2.1: 표시명
  // 누적 신고
  accumulatedReportCount: number;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
  sanctionType: 'NONE' | SanctionType | null;
  targetPreviousReports: TargetPreviousReport[];
}

export interface TargetPreviousReport {
  id: number;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
}

export interface ReportSummary {
  totalUnresolved: number;
  slaApproaching: number;
  slaExceeded: number;
  pendingCount: number;
  underReviewCount: number;
  resolvedCount: number;
  dismissedCount: number;
}

export interface Block {
  id: number;
  blockerId: number;
  blockerNickname: string;
  blockedId: number;
  blockedNickname: string;
  reason: BlockReason;
  status: BlockStatus;
  createdAt: string;
  unblockedAt: string | null;
}

export interface ContactDetection {
  id: number;
  contentId: number;
  contentType: string;
  userId: number;
  nickname: string;
  patternType: ContactPatternType;
  detectedText: string;
  context: string;
  confidence: number;
  status: ContactDetectionStatus;
  detectedAt: string;
}

// Spring Pageable 기반 검색 파라미터 (API v2.1 확장)
export interface ReportSearchParams {
  status?: ReportStatus;
  reason?: ReportReason;
  page?: number;
  size?: number;
  dateFrom?: string;
  dateTo?: string;
  // v2.1 신규 필터
  assignedTo?: number | 'me' | 'unassigned';
  slaOverdue?: boolean;
  minPriority?: number; // 0~100
}
