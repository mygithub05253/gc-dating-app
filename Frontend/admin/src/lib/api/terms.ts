import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Terms, TermsCreateRequest, TermsSearchParams, TermsVersionHistory } from '@/types/content';

export const termsApi = {
  // 약관 목록 조회
  getList: (params?: TermsSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Terms>>>('/api/admin/terms', { params }),

  // 약관 상세 조회
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Terms>>(`/api/admin/terms/${id}`),

  // 약관 등록
  create: (data: TermsCreateRequest) =>
    apiClient.post<ApiResponse<Terms>>('/api/admin/terms', data),

  // 약관 수정 (새 버전 생성 + 공지 자동 연동)
  update: (id: number, data: Partial<TermsCreateRequest>) =>
    apiClient.put<ApiResponse<Terms>>(`/api/admin/terms/${id}`, data),

  // 약관 비활성화 (soft delete)
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/terms/${id}`),

  // 약관 버전 이력 조회
  getHistory: () =>
    apiClient.get<ApiResponse<TermsVersionHistory[]>>('/api/admin/terms/history'),
};
