// 백엔드 ApiResponse<T>에 대응
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// 기능명세서 기준 커서 기반 페이징 응답
export interface CursorResponse<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
}

// Spring Data JPA 오프셋 기반 (관리자 계정 등 소규모 데이터용)
export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
}

// 에러 응답
export interface ApiError {
  code: string;
  message: string;
  data: null;
}
