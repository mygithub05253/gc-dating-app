import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';
import type { AdminUserDetail, UserSearchParams } from '@/types/user';

export const usersApi = {
  getList: (params: UserSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<AdminUserDetail>>>('/api/admin/users', { params }),

  getDetail: (id: number) =>
    apiClient.get<ApiResponse<AdminUserDetail>>(`/api/admin/users/${id}`),

  suspend: (id: number, reason: string) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/users/${id}/suspend`, { reason }),

  ban: (id: number, reason: string) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/users/${id}/ban`, { reason }),

  unsuspend: (id: number) =>
    apiClient.post<ApiResponse<null>>(`/api/admin/users/${id}/unsuspend`),
};
