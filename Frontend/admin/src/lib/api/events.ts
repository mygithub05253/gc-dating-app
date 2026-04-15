import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Event, EventCreateRequest, EventReport, EventStatus } from '@/types/event';

export const eventsApi = {
  // 이벤트 목록 조회
  getList: (params?: { status?: EventStatus; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Event>>>('/api/admin/events', { params }),

  // 이벤트 생성
  create: (data: EventCreateRequest) =>
    apiClient.post<ApiResponse<Event>>('/api/admin/events', data),

  // 이벤트 상태 변경
  changeStatus: (id: number, status: EventStatus) =>
    apiClient.patch<ApiResponse<null>>(`/api/admin/events/${id}/status`, { status }),

  // 이벤트 효과 리포트 조회
  getReport: (id: number) =>
    apiClient.get<ApiResponse<EventReport>>(`/api/admin/events/${id}/report`),
};
