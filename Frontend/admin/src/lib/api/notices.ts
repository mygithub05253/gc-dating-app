import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Notice, NoticeCreateRequest, NoticeSearchParams, NoticeStatus } from '@/types/content';

export const noticesApi = {
  // 공지사항 목록 조회
  getList: (params?: NoticeSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Notice>>>('/api/admin/notices', { params }),

  // 공지사항 상세 조회
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<Notice>>(`/api/admin/notices/${id}`),

  // 공지사항 등록
  create: (data: NoticeCreateRequest) =>
    apiClient.post<ApiResponse<Notice>>('/api/admin/notices', data),

  // 공지사항 수정
  update: (id: number, data: Partial<NoticeCreateRequest>) =>
    apiClient.put<ApiResponse<Notice>>(`/api/admin/notices/${id}`, data),

  // 공지사항 상태 변경 (DRAFT/PUBLISHED/HIDDEN — ERD v2.0 기준)
  changeStatus: (id: number, status: NoticeStatus) =>
    apiClient.patch<ApiResponse<null>>(`/api/admin/notices/${id}/status`, { status }),
};
