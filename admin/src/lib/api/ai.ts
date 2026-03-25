import apiClient from './client';
import type { ApiResponse } from './types';
import type {
  PipelineStatus,
  QueueStatus,
  ABTestResult,
  ABTestWeightConfig,
  ConsentWithdrawalStats,
  RetrainingStatus,
} from '@/types/ai';

export const aiApi = {
  // AI 파이프라인 상태 조회
  getPipelineStatus: () =>
    apiClient.get<ApiResponse<PipelineStatus[]>>('/api/admin/ai/pipeline/status'),

  // RabbitMQ 큐 상태 조회
  getQueueStatus: () =>
    apiClient.get<ApiResponse<QueueStatus[]>>('/api/admin/ai/queue/status'),

  // 일기 재분석 트리거
  reanalyze: (diaryId: number) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/ai/reanalyze/${diaryId}`),

  // A/B 테스트 결과 조회
  getABTestResults: (params?: { testId?: number; startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<ABTestResult[]>>('/api/admin/ai/ab-test/results', { params }),

  // A/B 테스트 가중치 설정
  configABTest: (data: ABTestWeightConfig) =>
    apiClient.post<ApiResponse<null>>('/api/admin/ai/ab-test/config', data),

  // AI 분석 동의 철회 통계
  getConsentStats: (params?: { startDate?: string; endDate?: string; granularity?: string }) =>
    apiClient.get<ApiResponse<ConsentWithdrawalStats>>('/api/admin/ai/analysis-consent/stats', { params }),

  // 모델 재학습 트리거
  retrain: (modelType: string) =>
    apiClient.post<ApiResponse<RetrainingStatus>>('/api/admin/ai/models/retrain', { modelType }),

  // 재학습 상태 조회
  getRetrainStatus: (taskId: string) =>
    apiClient.get<ApiResponse<RetrainingStatus>>(`/api/admin/ai/models/retrain/${taskId}/status`),
};
