import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Topic, TopicSearchParams, TopicSchedule } from '@/types/content';

export const topicsApi = {
  // 주제 목록 조회
  getList: (params?: TopicSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Topic>>>('/api/admin/topics', { params }),

  // 주제 등록
  create: (data: { content: string; category: string }) =>
    apiClient.post<ApiResponse<Topic>>('/api/admin/topics', data),

  // 주제 수정
  update: (id: number, data: { content?: string; category?: string; isActive?: boolean }) =>
    apiClient.put<ApiResponse<Topic>>(`/api/admin/topics/${id}`, data),

  // 주제 삭제 (soft delete)
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/topics/${id}`),

  // 주제 스케줄 조회 (향후 4주)
  getSchedule: () =>
    apiClient.get<ApiResponse<TopicSchedule[]>>('/api/admin/topics/schedule'),

  // 주제 스케줄 수동 오버라이드
  overrideSchedule: (week: string, topicIds: number[]) =>
    apiClient.put<ApiResponse<null>>(`/api/admin/topics/schedule/${week}`, { topicIds }),
};
