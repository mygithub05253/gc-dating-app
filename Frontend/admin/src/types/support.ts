// 고객 문의 / 이의신청 / FAQ 도메인 타입
// 출처: 관리자_API_통합명세서_v2.1 §17 (고객지원), §22 (FAQ)

// ───── 고객 문의 ─────
export type InquiryCategory =
  | 'ACCOUNT'
  | 'MATCHING'
  | 'EXCHANGE'
  | 'CHAT'
  | 'PAYMENT'
  | 'BUG'
  | 'OTHER';

export type InquiryStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Inquiry {
  id: number;
  userId: number;
  userNickname: string;
  userEmail?: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  assignedAdminId?: number | null;
  assignedAdminEmail?: string | null;
  answer: string | null;
  answeredBy?: string | null;
  answeredById?: number | null;
  answeredByName?: string | null;
  answeredAt: string | null;
  closedAt?: string | null;
  createdAt: string;
  modifiedAt?: string;
}

// ───── 이의신청 ─────
export type AppealStatus = 'PENDING' | 'DECIDED';

export type AppealDecision = 'MAINTAIN' | 'REDUCE' | 'RELEASE';

export type SanctionType = 'WARNING' | 'SUSPEND_7D' | 'SUSPEND_30D' | 'BANNED';

export interface SanctionAppeal {
  id: number;
  userId: number;
  userNickname: string;
  userEmail?: string;
  sanctionId: number;
  sanctionType: string;
  sanctionReason: string;
  sanctionDate: string;
  // 레거시 호환 필드
  originalSanctionType?: SanctionType;
  originalReason?: string;
  reason: string; // 이의신청 사유
  evidenceUrls?: string[]; // 증거 첨부
  status: AppealStatus;
  decision: AppealDecision | null;
  decisionReason: string | null;
  decidedById?: number | null;
  decidedByName?: string | null;
  decidedAt: string | null;
  // 레거시 호환 필드
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  createdAt: string;
}

// ───── FAQ ─────
export type FAQCategory = 'ACCOUNT' | 'MATCHING' | 'DIARY' | 'PAYMENT' | 'ETC';

export interface FAQ {
  id: number;
  category: FAQCategory;
  question: string;
  answer: string; // 마크다운, 최대 2000자
  displayOrder: number;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ───── 검색 파라미터 ─────
export interface InquirySearchParams {
  keyword?: string;
  category?: InquiryCategory;
  status?: InquiryStatus;
  page?: number;
  size?: number;
}

export interface AppealSearchParams {
  status?: AppealStatus;
  page?: number;
  size?: number;
}

export interface FAQSearchParams {
  category?: FAQCategory;
  isActive?: boolean;
  page?: number;
  size?: number;
}
