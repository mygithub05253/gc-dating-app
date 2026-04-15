// ─── 배치 작업 ───
export type BatchJobStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface BatchJob {
  id: number;
  name: string;
  description: string;
  cronExpression: string;
  status: BatchJobStatus;
  lastRunAt: string | null;
  lastRunStatus: 'SUCCESS' | 'FAILED' | null;
  lastRunDuration: number | null;
  successRate: number;
  nextRunAt: string;
}

// ─── 기능 플래그 ───
export type FeatureFlagCategory = 'AI' | 'UI' | 'FEATURE' | 'NOTIFICATION' | 'SAFETY' | 'PAYMENT';

export interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetUsers: 'ALL' | 'PREMIUM' | 'BETA' | 'NONE';
  updatedAt: string;
  updatedBy: string;
}

// ─── 시스템 모니터링 ───
export type SystemServiceStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type AIModelStatus = 'LOADED' | 'LOADING' | 'ERROR';

export interface SystemHealth {
  service: string;
  status: SystemServiceStatus;
  uptime: number;
  lastChecked: string;
  details: Record<string, unknown>;
}

// ─── 소셜 로그인 ───
export interface SocialAuthIssue {
  provider: string;
  errorType: string;
  errorCount: number;
  lastOccurred: string;
  status: string;
}

export interface SocialAuthStats {
  provider: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

export interface SocialAuthErrorHistory {
  id: number;
  provider: string;
  errorType: string;
  errorMessage: string;
  userId: number | null;
  createdAt: string;
}
