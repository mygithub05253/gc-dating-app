// 기능명세서 3.1 기준 KPI (7개 지표)
export interface DashboardKPI {
  totalSignups: number;
  newSignupsToday: number;
  activeMatching: number;
  matchingSuccessRate: number;
  diaryCountToday: number;
  exchangeDiaryCountToday: number;
  churnRate7d: number;
}

// KPI 카드 (차트 포함)
export interface KPICard {
  key: string;
  label: string;
  currentValue: number;
  changeRate: number;
  changeDirection: 'UP' | 'DOWN';
  miniChart: { date: string; value: number }[];
}

// 이상 징후 알림
export interface AnomalyAlert {
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  link: string;
}

export interface DashboardKPIResponse {
  kpiCards: KPICard[];
  anomalyAlerts: AnomalyAlert[];
  lastUpdatedAt: string;
}

// 3.2 주요 지표 요약
export interface SummaryMetric {
  key: string;
  label: string;
  currentValue: number;
  unit: string;
  changeRate: number;
  changeDirection: 'UP' | 'DOWN';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  link: string;
}

export interface SummaryCategory {
  categoryKey: string;
  categoryLabel: string;
  metrics: SummaryMetric[];
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
