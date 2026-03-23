// 백엔드 ApiResponse<T>에 대응
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

// 페이징 응답
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
