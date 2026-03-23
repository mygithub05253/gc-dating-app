export type ReportReason = 'PROFANITY' | 'OBSCENE' | 'PERSONAL_INFO' | 'FAKE' | 'SPAM' | 'OTHER';
export type ReportStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: number;
  reporterId: number;
  reporterNickname: string;
  targetId: number;
  targetNickname: string;
  reason: ReportReason;
  detail: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ReportSearchParams {
  status?: ReportStatus;
  reason?: ReportReason;
  page?: number;
  size?: number;
}
