import apiClient from './client';
import type { ApiResponse, PageResponse } from './types';

export interface MatchingStatsDetail {
  totalMatches: number;
  dailyMatches: number;
  successRate: number;
  averageMatchTime: number;
  exchangeCompletionRate: number;
}

export interface ExchangeRoom {
  id: number;
  user1Id: number;
  user1Nickname: string;
  user2Id: number;
  user2Nickname: string;
  status: string;
  exchangeCount: number;
  createdAt: string;
  lastActivityAt: string;
}

export const matchingApi = {
  // 매칭 통계 조회
  getStats: () =>
    apiClient.get<ApiResponse<MatchingStatsDetail>>('/api/admin/matching/stats'),

  // 교환일기방 목록 조회
  getExchangeRooms: (params?: { status?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<ExchangeRoom>>>('/api/admin/exchange-rooms', { params }),

  // 교환일기방 상세 조회
  getExchangeRoomDetail: (roomId: number) =>
    apiClient.get<ApiResponse<ExchangeRoom>>(`/api/admin/exchange-rooms/${roomId}`),
};
