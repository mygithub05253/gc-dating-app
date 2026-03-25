import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { Block, ContactDetection, ReportSummary } from '@/types/report';

export const blocksApi = {
  // 차단 이력 조회
  getList: (params?: {
    keyword?: string;
    status?: string;
    page?: number;
    size?: number;
  }) =>
    apiClient.get<ApiResponse<PageResponse<Block>>>('/api/admin/blocks', { params }),
};

export const reportStatsApi = {
  // 신고 요약 통계 조회
  getSummary: () =>
    apiClient.get<ApiResponse<ReportSummary>>('/api/admin/reports/summary'),
};

export const contactDetectionApi = {
  // 외부 연락처 탐지 목록 (AI 서버 경유)
  getList: (params?: {
    patternType?: string;
    status?: string;
    page?: number;
    size?: number;
  }) =>
    apiClient.get<ApiResponse<PageResponse<ContactDetection>>>('/api/admin/contact-detections', { params }),
};
