// ─── AI 파이프라인 ───
export type ABTestStatus = 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'SCHEDULED';
export type ABTestModel = 'MATCHING' | 'COACHING' | 'KEYWORD' | 'NOTIFICATION' | 'SAFETY';

export interface PipelineStatus {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastChecked: string;
  details: Record<string, unknown>;
}

export interface QueueStatus {
  queueName: string;
  messageCount: number;
  consumerCount: number;
  publishRate: number;
  deliverRate: number;
}

export interface ABTestResult {
  testId: number;
  modelType: ABTestModel;
  status: ABTestStatus;
  period: { startDate: string; endDate: string };
  groups: ABTestGroup[];
  pValue: number;
  isSignificant: boolean;
  currentWeights: {
    idealKeywordWeight: number;
    koSimCSEWeight: number;
    targetGroup: string;
  };
}

export interface ABTestGroup {
  groupName: 'A' | 'B';
  modelVersion: string;
  userCount: number;
  matchRate: number;
  avgMatchScore: number;
  exchangeCompletionRate: number;
}

export interface ABTestWeightConfig {
  idealKeywordWeight: number;
  koSimCSEWeight: number;
  targetGroup: string;
}

export interface ConsentWithdrawalStats {
  totalOptOutUsers: number;
  optOutRate: number;
  pendingProcessingCount: number;
  reasonDistribution: {
    privacyConcern: number;
    aiInaccuracy: number;
    other: number;
    skipped: number;
  };
  weeklyChangeRate: number;
  alertLevel: 'NONE' | 'WARN';
  recentTrend: { date: string; count: number }[];
}

export interface RetrainingStatus {
  taskId: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  startedAt: string;
  estimatedCompletionTime: string;
  newModelVersion: string | null;
  metrics: { f1Score: number; aucRoc: number } | null;
}
