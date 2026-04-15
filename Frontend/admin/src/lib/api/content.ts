import apiClient from './client';
import type { ApiResponse } from './types';
import type { ExampleDiary, ExchangeDiaryGuideStep, Banner } from '@/types/content';

export const exampleDiariesApi = {
  // 예제 일기 목록 조회
  getList: () =>
    apiClient.get<ApiResponse<ExampleDiary[]>>('/api/admin/example-diaries'),

  // 예제 일기 등록
  create: (data: Omit<ExampleDiary, 'id' | 'createdAt'>) =>
    apiClient.post<ApiResponse<ExampleDiary>>('/api/admin/example-diaries', data),

  // 예제 일기 수정
  update: (id: number, data: Partial<ExampleDiary>) =>
    apiClient.put<ApiResponse<ExampleDiary>>(`/api/admin/example-diaries/${id}`, data),

  // 예제 일기 삭제
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/example-diaries/${id}`),
};

export const exchangeDiaryGuideApi = {
  // 교환일기 흐름 가이드 조회
  getGuide: () =>
    apiClient.get<ApiResponse<ExchangeDiaryGuideStep[]>>('/api/admin/exchange-diary-guide'),

  // 교환일기 흐름 가이드 단계 교체
  updateSteps: (steps: ExchangeDiaryGuideStep[]) =>
    apiClient.put<ApiResponse<null>>('/api/admin/exchange-diary-guide/steps', { steps }),
};

export const bannersApi = {
  // 배너 목록 조회
  getList: () =>
    apiClient.get<ApiResponse<Banner[]>>('/api/admin/banners'),

  // 배너 생성
  create: (data: Omit<Banner, 'id' | 'createdAt'>) =>
    apiClient.post<ApiResponse<Banner>>('/api/admin/banners', data),

  // 배너 수정
  update: (id: number, data: Partial<Banner>) =>
    apiClient.put<ApiResponse<Banner>>(`/api/admin/banners/${id}`, data),
};
