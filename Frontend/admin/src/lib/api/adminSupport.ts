import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type {
  Inquiry,
  InquirySearchParams,
  SanctionAppeal,
  AppealSearchParams,
} from '@/types/support';

// ── 관리자 고객지원 API (명세 v2.1 §17) ──

export const adminSupportApi = {
  // ── 문의 관리 ──

  /** 문의 목록 조회 */
  getInquiries: (params?: InquirySearchParams) =>
    apiClient.get<ApiResponse<PageResponse<Inquiry>>>('/api/admin/support/inquiries', { params }),

  /** 문의 상세 조회 */
  getInquiry: (id: number) =>
    apiClient.get<ApiResponse<Inquiry>>(`/api/admin/support/inquiries/${id}`),

  /** 문의 답변 등록 */
  replyInquiry: (id: number, answer: string) =>
    apiClient.patch<ApiResponse<Inquiry>>(`/api/admin/support/inquiries/${id}/reply`, { answer }),

  /** 문의 종료 처리 */
  closeInquiry: (id: number) =>
    apiClient.patch<ApiResponse<Inquiry>>(`/api/admin/support/inquiries/${id}/close`),

  // ── 이의신청 관리 ──

  /** 이의신청 목록 조회 */
  getAppeals: (params?: AppealSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<SanctionAppeal>>>('/api/admin/support/appeals', { params }),

  /** 이의신청 상세 조회 */
  getAppeal: (id: number) =>
    apiClient.get<ApiResponse<SanctionAppeal>>(`/api/admin/support/appeals/${id}`),

  /** 이의신청 결정 처리 */
  resolveAppeal: (id: number, decision: string, decisionReason: string) =>
    apiClient.patch<ApiResponse<SanctionAppeal>>(`/api/admin/support/appeals/${id}/resolve`, {
      decision,
      decisionReason,
    }),
};
