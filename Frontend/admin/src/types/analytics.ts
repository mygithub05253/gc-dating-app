/**
 * 관리자 분석 API 타입 정의 — 백엔드 관리자 API v2.1 §18 / 설계서 §3.
 *
 * B-1.1 ~ B-5 에 대응하는 17개 응답 DTO 미러. 백엔드:
 *   Backend/src/main/java/com/ember/ember/admin/dto/analytics/*.java
 *
 * 공통 패턴:
 *   - Period { startDate, endDate, timezone } — 모든 응답의 기간 메타
 *   - Meta   { algorithm?, degraded?, dataSourceVersion?, kAnonymityMin? } — 가변 필드
 */

// ---------------------------------------------------------------------------
// 공통 구조
// ---------------------------------------------------------------------------

export interface AnalyticsPeriod {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  timezone: string;  // "Asia/Seoul"
}

export interface AnalyticsBaseMeta {
  kAnonymityMin?: number;
  degraded?: boolean;
  dataSourceVersion?: string;
  algorithm?: string;
}

// 분석 API 공통 쿼리 파라미터 기본형
export interface AnalyticsDateRangeParams {
  startDate?: string; // yyyy-MM-dd
  endDate?: string;   // yyyy-MM-dd
}

// ---------------------------------------------------------------------------
// B-1.1 매칭 퍼널 (MatchingFunnelResponse)
// ---------------------------------------------------------------------------

export interface MatchingFunnelDailyPoint {
  date: string;
  recommendations: number;
  accepts: number;
  exchanges: number;
  couples: number;
}

export interface MatchingFunnelStageTotals {
  recommendations: number;
  accepts: number;
  exchanges: number;
  couples: number;
  acceptRate: number | null;    // accepts / recs
  exchangeRate: number | null;  // exchanges / accepts
  coupleRate: number | null;    // couples / exchanges
}

export interface MatchingFunnelResponse {
  period: AnalyticsPeriod;
  gender: 'M' | 'F' | 'ALL';
  daily: MatchingFunnelDailyPoint[];
  totals: MatchingFunnelStageTotals;
  worstDropoffStage: 'ACCEPT' | 'EXCHANGE' | 'COUPLE' | null;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.2 사용자 퍼널·코호트 (UserFunnelResponse)
// ---------------------------------------------------------------------------

export interface UserFunnelStageCount {
  count: number;
  rate: number | null;
}

export interface UserFunnelStages {
  signup: UserFunnelStageCount;
  profile: UserFunnelStageCount;
  match: UserFunnelStageCount;
  exchange: UserFunnelStageCount;
  couple: UserFunnelStageCount;
}

export interface UserFunnelDropoff {
  signupToProfile: number | null;
  profileToMatch: number | null;
  matchToExchange: number | null;
  exchangeToCouple: number | null;
}

export interface UserFunnelCohortRow {
  weekStart: string;   // yyyy-MM-dd
  weekEnd: string;     // yyyy-MM-dd
  maturityDays: number;
  maturityLabel: 'WARMING_UP' | 'PARTIAL' | 'MATURE';
  stages: UserFunnelStages;
  dropoff: UserFunnelDropoff;
}

export interface UserFunnelSummary {
  totalSignups: number;
  overallConversion: number | null;
  worstStage: string | null;
}

export interface UserFunnelResponse {
  period: AnalyticsPeriod;
  cohort: 'signup_date' | 'first_match_date';
  cohorts: UserFunnelCohortRow[];
  summary: UserFunnelSummary;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.3 키워드 TopN (KeywordTopResponse)
// ---------------------------------------------------------------------------

export type KeywordTagType = 'EMOTION' | 'LIFESTYLE' | 'RELATIONSHIP_STYLE' | 'TONE' | 'ALL';

export interface KeywordItem {
  tagType: KeywordTagType;
  label: string;
  count: number;
  diaryCount: number;
  userCount: number;
  share: number | null;      // count / totalCount
  masked: boolean;           // k-anonymity 미충족 시 true
}

export interface KeywordTopResponse {
  period: AnalyticsPeriod;
  tagType: KeywordTagType;
  items: KeywordItem[];
  totalCount: number;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.4 세그먼트 Overview (SegmentOverviewResponse)
// ---------------------------------------------------------------------------

export type SegmentMetric = 'SIGNUP' | 'ACTIVE' | 'DIARY' | 'ACCEPT';

export interface SegmentRow {
  gender: string | null;
  ageGroup: string | null;
  regionCode: string | null;
  value: number;
  share: number | null;
  masked: boolean;
}

export interface SegmentOverviewResponse {
  period: AnalyticsPeriod;
  metric: SegmentMetric;
  groupBy: string[];
  rows: SegmentRow[];
  total: number;
  maskedCount: number;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.5 여정 소요시간 (JourneyDurationResponse)
// ---------------------------------------------------------------------------

export interface JourneyStageDuration {
  stage: string; // signup->profile / profile->match / match->exchange / exchange->couple
  p50Hours: number | null;
  p90Hours: number | null;
  p99Hours: number | null;
  sampleSize: number;
}

export interface JourneyDurationResponse {
  period: AnalyticsPeriod;
  stages: JourneyStageDuration[];
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.6 AI 성능 (AiPerformanceResponse)
// ---------------------------------------------------------------------------

export interface AiModelStat {
  model: string; // KcELECTRA / KoSimCSE / ...
  totalProcessed: number;
  succeeded: number;
  failed: number;
  successRate: number | null;
}

export interface AiPerformanceResponse {
  periodStart: string; // ISO datetime
  periodEnd: string;
  models: AiModelStat[];
  lifestyleThroughput: number; // 기간 내 라이프스타일 분석 건수
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-1.7 매칭 다양성·재추천 (MatchingDiversityResponse)
// ---------------------------------------------------------------------------

export interface DiversityDailyPoint {
  date: string;
  shannonEntropy: number | null;
  uniquePairs: number;
  totalRecommendations: number;
}

export interface MatchingDiversityResponse {
  period: AnalyticsPeriod;
  daily: DiversityDailyPoint[];
  avgShannonEntropy: number | null;
  rerecommendationRate: number | null;
  rerecommendationWindowDays: number;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.1 일기 시간 히트맵 (DiaryTimeHeatmapResponse)
// ---------------------------------------------------------------------------

export interface HeatmapCell {
  dayOfWeek: number; // 0=일요일, 6=토요일
  hour: number;      // 0~23
  count: number;
}

export interface DiaryTimeHeatmapResponse {
  period: AnalyticsPeriod;
  cells: HeatmapCell[];
  peakDayOfWeek: number;
  peakHour: number;
  totalDiaries: number;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.2 일기 길이·품질 (DiaryLengthQualityResponse)
// ---------------------------------------------------------------------------

export interface LengthStats {
  p50: number | null;
  p90: number | null;
  p99: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
}

export interface LengthBucket {
  range: string;   // "100-199" / "200-399" / ...
  count: number;
  share: number | null;
}

export interface QualityStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number | null;
  avgCharactersPerDiary: number | null;
}

export interface DiaryLengthQualityResponse {
  period: AnalyticsPeriod;
  stats?: LengthStats;
  lengthStats?: LengthStats;
  buckets?: LengthBucket[];
  histogram?: LengthBucket[];
  quality?: QualityStats;
  qualityStats?: QualityStats;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.3 감정 태그 추이 (DiaryEmotionTrendResponse)
// ---------------------------------------------------------------------------

export interface EmotionTrendPoint {
  date: string;                 // bucket=day 면 yyyy-MM-dd, week 면 주 월요일
  counts: Record<string, number>; // { HAPPY: 12, SAD: 3, ... }
}

export interface DiaryEmotionTrendResponse {
  period: AnalyticsPeriod;
  bucket: 'day' | 'week';
  topEmotions: string[]; // 상위 topN 감정 (차트 축 고정용)
  points: EmotionTrendPoint[];
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.4 주제 참여 (DiaryTopicParticipationResponse)
// ---------------------------------------------------------------------------

export interface TopicRow {
  category: string;
  diaryCount: number;
  userCount: number;
  diaryShare: number | null;
  userShare: number | null;
}

export interface DiaryTopicParticipationResponse {
  period: AnalyticsPeriod;
  topics: TopicRow[];
  totalDiaries: number;
  totalUsers: number;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.5 교환일기 응답률 (ExchangeResponseRateResponse)
// ---------------------------------------------------------------------------

export interface ResponseDelayStats {
  p50Hours: number | null;
  p90Hours: number | null;
  p99Hours: number | null;
}

export interface TurnResponseRow {
  turn: number; // 1, 2, 3, 4
  responded: number;
  timedOut: number;
  rate: number | null;
  delay: ResponseDelayStats;
}

export interface ExchangeResponseRateResponse {
  period: AnalyticsPeriod;
  windowHours: number;
  firstResponseRate: number | null; // 턴1 제출 후 window 내 턴2
  turnRows: TurnResponseRow[];
  overallDelay: ResponseDelayStats;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.6 교환일기 턴→채팅 퍼널 (ExchangeTurnFunnelResponse)
// ---------------------------------------------------------------------------

export type ExchangeFunnelStageKey =
  | 'ROOM_CREATED'
  | 'TURN_1_COMPLETE'
  | 'TURN_2_COMPLETE'
  | 'TURN_3_COMPLETE'
  | 'TURN_4_COMPLETE'
  | 'CHAT_CONNECTED';

export interface ExchangeFunnelStage {
  stage: ExchangeFunnelStageKey;
  count: number;
  rate: number | null;     // vs ROOM_CREATED
  dropoffRate: number | null;
}

export interface ExchangeTurnFunnelResponse {
  period: AnalyticsPeriod;
  stages: ExchangeFunnelStage[];
  worstStage: ExchangeFunnelStageKey | null;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-2.7 사용자 이탈 생존분석 Kaplan-Meier (RetentionSurvivalResponse)
// ---------------------------------------------------------------------------

export interface SurvivalPoint {
  day: number;                 // 가입 후 경과 일
  atRisk: number;              // 리스크 셋
  events: number;              // 해당 시점 이탈
  survivalProbability: number | null;
  stdError: number | null;
  ciLower: number | null;
  ciUpper: number | null;
}

export interface RetentionSurvivalResponse {
  period: AnalyticsPeriod;
  inactivityThresholdDays: number;
  cohortSize: number;
  eventCount: number;
  censoredCount: number;
  medianSurvivalDay: number | null;
  curve: SurvivalPoint[];
  meta: AnalyticsBaseMeta & {
    algorithm: 'kaplan-meier-greenwood';
    eventDefinition: string;
  };
}

// ---------------------------------------------------------------------------
// B-3 사용자 세그먼테이션 RFM + K-Means (UserSegmentationResponse)
// ---------------------------------------------------------------------------

export type RfmSegmentLabel =
  | 'CHAMPIONS'
  | 'LOYAL'
  | 'PROMISING'
  | 'AT_RISK'
  | 'LOST';

export interface RfmSegment {
  label: RfmSegmentLabel;
  userCount: number;
  share: number | null;
  avgRecency: number | null;
  avgFrequency: number | null;
  avgEngagement: number | null;
}

export interface RfmSummary {
  segments: RfmSegment[];
  totalUsers: number;
}

export interface KMeansCluster {
  clusterId: number;
  userCount: number;
  share: number | null;
  centroidZ: number[];   // [recency_z, frequency_z, engagement_z]
  centroidRaw: number[]; // original-scale
  avgDistance: number | null;
  label: string;         // auto label: HIGH_ENGAGEMENT / ACTIVE / CHURNING / DORMANT / ...
}

export interface KMeansSummary {
  k: number;
  clusters: KMeansCluster[];
  iterations: number;
  inertia: number;
  converged: boolean;
  tolerance: number;
  seed: number;
  featureMean: number[];
  featureStd: number[];
}

export interface UserSegmentationResponse {
  period: AnalyticsPeriod;
  method: 'RFM' | 'KMEANS' | 'BOTH';
  totalUsers: number;
  rfm?: RfmSummary;
  kmeans?: KMeansSummary;
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-4 연관 규칙 마이닝 Apriori (AssociationRulesResponse)
// ---------------------------------------------------------------------------

export interface FrequentItemset {
  items: string[]; // ex) ["EMOTION:HAPPY", "LIFESTYLE:CAFE"]
  count: number;
  support: number;
}

export interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  count: number;
  support: number;
  confidence: number;
  lift: number;
}

export interface AprioriParams {
  minSupport: number;
  minConfidence: number;
  minLift: number;
  maxItemsetSize: number;
  tagTypes: string[];
}

export interface AprioriStats {
  l1Size: number;
  l2Size: number;
  l3Size: number;
  ruleCount: number;
  candidatePruned: number;
}

export interface AssociationRulesResponse {
  period: AnalyticsPeriod;
  totalTransactions: number;
  totalItems: number;
  params: AprioriParams;
  stats: AprioriStats;
  frequentItemsets: FrequentItemset[];
  rules: AssociationRule[];
  meta: AnalyticsBaseMeta;
}

// ---------------------------------------------------------------------------
// B-5 코호트 리텐션 매트릭스 (CohortRetentionResponse)
// ---------------------------------------------------------------------------

export interface RetentionCell {
  weekOffset: number;
  retained: number | null;
  rate: number | null;
  observable: boolean;
}

export interface CohortRow {
  cohortWeekStart: string; // yyyy-MM-dd
  cohortWeekEnd: string;
  cohortSize: number;
  cells: RetentionCell[];
}

export interface AverageByWeek {
  weekOffset: number;
  averageRate: number | null;
  observableCohorts: number;
}

export interface CohortRetentionResponse {
  period: AnalyticsPeriod;
  maxWeeks: number;
  cohortCount: number;
  totalCohortUsers: number;
  cohorts: CohortRow[];
  averageByWeek: AverageByWeek[];
  meta: AnalyticsBaseMeta;
}
