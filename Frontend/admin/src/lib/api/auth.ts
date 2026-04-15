import apiClient from './client';
import type { ApiResponse } from './types';
import type { TokenResponse } from '@/types/common';

interface LoginRequest {
  email: string;
  password: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<TokenResponse>>('/api/admin/auth/login', data),

  logout: () => apiClient.post<ApiResponse<null>>('/api/admin/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<TokenResponse>>('/api/admin/auth/refresh', { refreshToken }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put<ApiResponse<null>>('/api/admin/auth/password', data),
};
