// ─── 이벤트/프로모션 ───
export type EventType = 'EVENT' | 'PROMOTION' | 'CAMPAIGN';
export type EventStatus = 'ACTIVE' | 'SCHEDULED' | 'PAUSED' | 'ENDED';
export type EventTarget = 'ALL' | 'NEW_USERS' | 'PREMIUM' | 'INACTIVE';

export interface Event {
  id: number;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  target: EventTarget;
  startDate: string;
  endDate: string;
  participantCount: number;
  completionCount: number;
  conversionRate: number;
  createdAt: string;
  createdBy: string;
}

export interface EventCreateRequest {
  title: string;
  description: string;
  type: EventType;
  target: EventTarget;
  startDate: string;
  endDate: string;
}

export interface EventReport {
  eventId: number;
  participantCount: number;
  completionCount: number;
  conversionRate: number;
  dailyTrend: { date: string; participants: number; completions: number }[];
}

// ─── 문의(Inquiry) ───
export type InquiryCategory = 'ACCOUNT' | 'MATCHING' | 'PAYMENT' | 'BUG' | 'FEATURE' | 'OTHER';
export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Inquiry {
  id: number;
  userId: number;
  userNickname: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
}

// ─── 이의신청(Appeal) ───
export type AppealStatus = 'PENDING' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED';

export interface Appeal {
  id: number;
  userId: number;
  userNickname: string;
  sanctionType: string;
  sanctionReason: string;
  appealContent: string;
  status: AppealStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolveNote: string | null;
  createdAt: string;
}
