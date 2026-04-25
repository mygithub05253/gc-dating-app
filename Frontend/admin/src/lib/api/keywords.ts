import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  Keyword,
  KeywordBulkWeightRequest,
  KeywordCreateRequest,
  KeywordListParams,
  KeywordListResponse,
  KeywordUpdateRequest,
} from '@/types/keyword';

/**
 * 이상형 키워드 관리 API.
 * BE: AdminKeywordController (/api/admin/keywords/*)
 */
export const keywordsApi = {
  // 목록 조회
  getList: (params?: KeywordListParams) =>
    apiClient.get<ApiResponse<KeywordListResponse>>('/api/admin/keywords', { params }),

  // 상세 조회
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Keyword>>(`/api/admin/keywords/${id}`),

  // 등록
  create: (data: KeywordCreateRequest) =>
    apiClient.post<ApiResponse<Keyword>>('/api/admin/keywords', data),

  // 수정
  update: (id: number, data: KeywordUpdateRequest) =>
    apiClient.put<ApiResponse<Keyword>>(`/api/admin/keywords/${id}`, data),

  // 삭제
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/keywords/${id}`),

  // 일괄 가중치 수정
  bulkUpdateWeight: (data: KeywordBulkWeightRequest) =>
    apiClient.patch<ApiResponse<null>>('/api/admin/keywords/bulk-weight', data),
};
