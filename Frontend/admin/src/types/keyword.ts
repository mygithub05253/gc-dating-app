// 이상형 키워드 관리 타입 정의 (ERD v2.0: keywords 테이블)

export type KeywordCategory =
  | 'PERSONALITY'
  | 'LIFESTYLE'
  | 'INTEREST'
  | 'VALUE';

export interface Keyword {
  id: number;
  label: string;
  category: KeywordCategory;
  weight: number;
  displayOrder: number;
  userCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordListResponse {
  items: Keyword[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface KeywordListParams {
  category?: KeywordCategory;
  isActive?: boolean;
  page?: number;
  size?: number;
}

export interface KeywordCreateRequest {
  label: string;
  category: KeywordCategory;
  weight: number;
  displayOrder: number;
  isActive: boolean;
}

export interface KeywordUpdateRequest {
  label?: string;
  category?: KeywordCategory;
  weight?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface KeywordBulkWeightRequest {
  updates: { id: number; weight: number }[];
}
