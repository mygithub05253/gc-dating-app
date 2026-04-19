import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type {
  FAQ,
  FAQCategory,
  FAQSearchParams,
} from '@/types/support';

/**
 * FAQ 관리 API.
 * 출처: 관리자_API_통합명세서_v2.0 §22
 *
 * ⚠ 백엔드 미구현 — 본 모듈은 Mock 환경에서만 호출 시그니처를 검증한다.
 */
export const faqsApi = {
  // 22.1 목록 조회 (ADMIN 이상)
  getList: (params: FAQSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<FAQ>>>('/api/admin/faqs', {
      params,
    }),

  // 22.2 등록 (ADMIN 이상)
  create: (data: {
    category: FAQCategory;
    question: string;
    answer: string;
    displayOrder: number;
    isActive: boolean;
  }) => apiClient.post<ApiResponse<FAQ>>('/api/admin/faqs', data),

  // 22.3 수정 (ADMIN 이상)
  update: (
    faqId: number,
    data: Partial<{
      category: FAQCategory;
      question: string;
      answer: string;
      displayOrder: number;
      isActive: boolean;
    }>,
  ) => apiClient.put<ApiResponse<FAQ>>(`/api/admin/faqs/${faqId}`, data),

  // 22.4 삭제 (소프트 딜리트, ADMIN 이상)
  delete: (faqId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/faqs/${faqId}`),

  // 22.5 순서 변경 (ADMIN 이상)
  reorder: (category: FAQCategory, orderedIds: number[]) =>
    apiClient.patch<ApiResponse<null>>('/api/admin/faqs/reorder', {
      category,
      orderedIds,
    }),
};
