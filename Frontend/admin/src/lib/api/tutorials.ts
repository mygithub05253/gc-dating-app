import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Tutorial } from '@/types/content';

export interface TutorialCreateRequest {
  title: string;
  body: string;
  imageUrl?: string;
  pageOrder: number;
  isActive: boolean;
}

export interface TutorialSearchParams {
  type?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}

/**
 * 튜토리얼 관리 API.
 * BE: AdminTutorialController (/api/admin/tutorials/*)
 */
export const tutorialsApi = {
  // 목록 조회
  getList: (params?: TutorialSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Tutorial>>>('/api/admin/tutorials/pages', { params }),

  // 상세 조회
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Tutorial>>(`/api/admin/tutorials/pages/${id}`),

  // 등록
  create: (data: TutorialCreateRequest) =>
    apiClient.post<ApiResponse<Tutorial>>('/api/admin/tutorials/pages', data),

  // 수정
  update: (id: number, data: Partial<TutorialCreateRequest>) =>
    apiClient.put<ApiResponse<Tutorial>>(`/api/admin/tutorials/pages/${id}`, data),

  // 삭제
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/tutorials/pages/${id}`),
};
