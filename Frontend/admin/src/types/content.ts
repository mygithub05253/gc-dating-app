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

// ─── 공지사항(Notice) ───
export type NoticeCategory = 'TERMS' | 'EVENT' | 'MAINTENANCE' | 'UPDATE' | 'GENERAL';
export type NoticeStatus = 'PUBLISHED' | 'DRAFT' | 'SCHEDULED' | 'ARCHIVED';
export type NoticePriority = 'HIGH' | 'NORMAL';

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
  targetAudience: string;
}

export interface NoticeCreateRequest {
  category: NoticeCategory;
  title: string;
  content: string;
  priority: NoticePriority;
  status: NoticeStatus;
  publishedAt?: string;
  targetAudience?: string;
}

export interface NoticeSearchParams {
  category?: NoticeCategory;
  status?: NoticeStatus;
  keyword?: string;
  page?: number;
  size?: number;
}

// ─── 약관(Terms) ───
export type TermsType = 'SERVICE' | 'PRIVACY' | 'LOCATION' | 'MARKETING' | 'AI_ANALYSIS';
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

// ─── 예제 일기(Example Diary) ───
export interface ExampleDiary {
  id: number;
  title: string;
  content: string;
  category: TopicCategory;
  emotion: string;
  isActive: boolean;
  createdAt: string;
}

// ─── 교환일기 가이드 ───
export interface ExchangeDiaryGuideStep {
  step: number;
  title: string;
  description: string;
  imageUrl?: string;
}

// ─── 배너(Banner) ───
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
