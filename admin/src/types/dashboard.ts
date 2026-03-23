export interface DashboardKPI {
  dau: number;
  mau: number;
  newUsersToday: number;
  matchesToday: number;
  pendingReports: number;
  activeExchanges: number;
}

export interface DailyStats {
  date: string;
  newUsers: number;
  activeUsers: number;
  matches: number;
  diaries: number;
}

export interface MatchingStats {
  totalMatches: number;
  successRate: number;
  averageMatchTime: number;
  topKeywords: { keyword: string; count: number }[];
}
