import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Banner } from '@/types/content';

export interface BannerCreateRequest {
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
}

export interface BannerSearchParams {
  isActive?: boolean;
  page?: number;
  size?: number;
}

/**
 * 배너 관리 API.
 * BE: AdminBannerController (/api/admin/banners/*)
 */
export const bannersApi = {
  // 목록 조회
  getList: (params?: BannerSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Banner>>>('/api/admin/banners', { params }),

  // 상세 조회
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Banner>>(`/api/admin/banners/${id}`),

  // 등록
  create: (data: BannerCreateRequest) =>
    apiClient.post<ApiResponse<Banner>>('/api/admin/banners', data),

  // 수정
  update: (id: number, data: Partial<BannerCreateRequest>) =>
    apiClient.put<ApiResponse<Banner>>(`/api/admin/banners/${id}`, data),

  // 삭제
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/banners/${id}`),
};
