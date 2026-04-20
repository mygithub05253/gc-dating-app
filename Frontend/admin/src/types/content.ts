// ─── 주제(Topic) ───
export type TopicCategory = 'GRATITUDE' | 'GROWTH' | 'DAILY' | 'EMOTION' | 'RELATIONSHIP' | 'SEASONAL';

export interface Topic {
  id: number;
  content: string;
  category: TopicCategory;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface TopicSearchParams {
  category?: TopicCategory;
  isActive?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}

export interface TopicSchedule {
  week: string;
  topics: Topic[];
  isOverridden: boolean;
}

// ─── 공지사항(Notice) ── ERD v2.1 기준 (targetAudience Enum 5종)
export type NoticeCategory = 'GENERAL' | 'MAINTENANCE' | 'TERMS_CHANGE' | 'URGENT';
export type NoticeStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type NoticePriority = 'HIGH' | 'NORMAL';
// v2.1 신규 — ERD notices.target_audience 정합
export type NoticeTargetAudience = 'ALL' | 'NEW_USER' | 'ACTIVE_USER' | 'PREMIUM' | 'DORMANT';

export interface Notice {
  id: number;
  category: NoticeCategory;
  title: string;
  content: string;
  priority: NoticePriority;
  isPinned: boolean;
  status: NoticeStatus;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  viewCount: number;
  targetAudience: NoticeTargetAudience; // v2.1: 타입 강화
}

export interface NoticeCreateRequest {
  category: NoticeCategory;
  title: string;
  content: string;
  priority: NoticePriority;
  status: NoticeStatus;
  publishedAt?: string;
  targetAudience?: NoticeTargetAudience; // v2.1: 타입 강화. URGENT/MAINTENANCE 시 자동 ALL 보정
}

export interface NoticeSearchParams {
  category?: NoticeCategory;
  status?: NoticeStatus;
  keyword?: string;
  page?: number;
  size?: number;
}

// ─── 약관(Terms) ── ERD v2.0 기준 2종 통합
export type TermsType = 'USER_TERMS' | 'AI_TERMS';
export type TermsStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface Terms {
  id: number;
  type: TermsType;
  title: string;
  version: string;
  content: string;
  effectiveDate: string;
  status: TermsStatus;
  acceptCount: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TermsCreateRequest {
  type: TermsType;
  title: string;
  content: string;
  effectiveDate: string;
}

export interface TermsSearchParams {
  type?: TermsType;
  status?: TermsStatus;
  page?: number;
  size?: number;
}

export interface TermsVersionHistory {
  version: string;
  date: string;
  change: string;
}

// ─── 예제 일기(Example Diary) ── ERD v2.1 카테고리 6종 확장 (weekly_topics와 통일)
export type ExampleDiaryCategory =
  | 'GRATITUDE'
  | 'GROWTH'
  | 'DAILY'
  | 'EMOTION'
  | 'RELATIONSHIP'
  | 'SEASONAL';
export type ExampleDiaryTarget = 'ONBOARDING' | 'HELP' | 'FAQ';

export interface ExampleDiary {
  id: number;
  title: string;
  content: string;
  category: ExampleDiaryCategory;
  displayTarget: ExampleDiaryTarget;
  displayOrder: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

// ─── 교환일기 가이드 단계 ── ERD v2.0 기준 (필드명 정합화)
export interface ExchangeDiaryGuideStep {
  id: number;
  stepOrder: number;
  stepTitle: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
}

// ─── 배너(Banner) ──
export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// ─── 금칙어(Banned Word) ── ERD v2.0 신설
export type BannedWordCategory = 'PROFANITY' | 'SEXUAL' | 'DISCRIMINATION' | 'ETC';

export interface BannedWord {
  id: number;
  word: string;
  category: BannedWordCategory;
  isActive: boolean;
  hitCount: number;
  createdBy: number;
  createdAt: string;
}

// ─── 튜토리얼(Tutorial) ──
export type TutorialType = 'ONBOARDING' | 'EXCHANGE_DIARY' | 'MATCHING' | 'PROFILE';

export interface TutorialStep {
  stepOrder: number;
  title: string;
  description: string;
  imageUrl: string;
}

export interface Tutorial {
  id: number;
  type: TutorialType;
  title: string;
  description: string;
  isActive: boolean;
  steps: TutorialStep[];
  version: string;
  updatedAt: string;
}
