'use client';

// AI 모니터링 메인 페이지 — v2.2 파이프라인 모니터링 위젯 5종 + AI 성능 지표 (실 API)

import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import { useAuthStore } from '@/stores/authStore';
import {
  useAiOverview,
  useReprocessDlq,
  useRetryOutbox,
  useForceFailDiary,
  useMqStatus,
  useRedisHealth,
  useAnalysisOverview,
} from '@/hooks/useMonitoring';
import { useAiPerformance } from '@/hooks/useAnalytics';
import { Brain, Target, TrendingUp, Activity, Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';

// Gauge Chart Component
function GaugeChart({ value, color, label, description }: { value: number; color: string; label: string; description: string }) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // 반원
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2} height={radius + 20} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        {/* Center text */}
        <text
          x={radius}
          y={radius - 10}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={color}
        >
          {value}%
        </text>
        <text
          x={radius}
          y={radius + 12}
          textAnchor="middle"
          className="text-xs"
          fill="#6b7280"
        >
          {label}
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AIMonitoringPage() {
  const { hasPermission } = useAuthStore();

  // 실 API 연동 — 30초 auto-refresh (Phase 3B)
  const { data: overview, isLoading: overviewLoading } = useAiOverview();
  const { data: mqStatus } = useMqStatus();
  const { data: redisHealth } = useRedisHealth();
  const { data: analysisOverview } = useAnalysisOverview();
  const { data: aiPerformance } = useAiPerformance();
  const reprocessDlq = useReprocessDlq();
  const retryOutbox = useRetryOutbox();
  const forceFailDiary = useForceFailDiary();

  // ─── v2.2 파이프라인 버튼 핸들러 ───────────────────────────

  // DLQ 재처리 (SUPER_ADMIN 전용)
  const handleDlqReprocess = () => {
    reprocessDlq.mutate('diary-analyze.dlq', {
      onSuccess: (res) => {
        const processed = res.data.data?.processedCount ?? 0;
        toast.success(`DLQ 재처리 완료: ${processed}건`);
      },
      onError: () => toast.error('DLQ 재처리 요청에 실패했습니다'),
    });
  };

  // Outbox 재시도 (SUPER_ADMIN 전용)
  const handleOutboxRetry = () => {
    retryOutbox.mutate(undefined, {
      onSuccess: (res) => {
        const retried = res.data.data?.retriedCount ?? 0;
        toast.success(`Outbox 재시도 완료: ${retried}건`);
      },
      onError: () => toast.error('Outbox 재시도 요청에 실패했습니다'),
    });
  };

  // 일기 분석 강제 FAILED 전이 (SUPER_ADMIN 전용)
  const handleForceFailDiary = () => {
    const diaryId = Number(window.prompt('강제 FAILED 전이할 diaryId를 입력하세요'));
    if (!diaryId) return;
    const reason = window.prompt('사유를 입력하세요 (예: STUCK_TIMEOUT)') || 'STUCK_TIMEOUT';
    forceFailDiary.mutate(
      { diaryId, reason },
      {
        onSuccess: () => toast.success('강제 FAILED 전이 완료'),
        onError: () => toast.error('강제 FAILED 전이 실패'),
      },
    );
  };

  // 포맷 헬퍼
  const fmtPercent = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
  const fmtNum = (v?: number) => (typeof v === 'number' ? v.toLocaleString() : '—');

  // AI 성능 데이터 추출
  const perfData = aiPerformance as any;
  const keywordAccuracy = perfData?.kcElectraAccuracy ?? perfData?.keywordAccuracy;
  const matchSuccessRate = perfData?.koSimCseMatchRate ?? perfData?.matchSuccessRate;
  const dailyAnalysisCount = perfData?.dailyAnalysisCount ?? analysisOverview?.diary?.done;
  const avgSimilarity = perfData?.avgSimilarityScore ?? perfData?.avgSimilarity;
  const dailyKeywordCount = perfData?.dailyKeywordCount;

  // 키워드/유사도 분포 차트 데이터
  const keywordDistribution = perfData?.keywordDistribution ?? [];
  const similarityDistribution = perfData?.similarityDistribution ?? [];
  const emotionDistribution = perfData?.emotionDistribution ?? [];

  // 모델 게이지 데이터
  const modelPerformanceData = [
    {
      name: 'KcELECTRA',
      value: keywordAccuracy != null ? Number((keywordAccuracy * (keywordAccuracy <= 1 ? 100 : 1)).toFixed(1)) : 0,
      color: '#8b5cf6',
      description: '키워드 추출 정확도',
    },
    {
      name: 'KoSimCSE',
      value: matchSuccessRate != null ? Number((matchSuccessRate * (matchSuccessRate <= 1 ? 100 : 1)).toFixed(1)) : 0,
      color: '#3b82f6',
      description: '매칭 성공률',
    },
  ];

  if (overviewLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI 모니터링"
        description="KcELECTRA 키워드 분석 및 KoSimCSE 매칭 성능 모니터링"
      />

      {/* ─── v2.2 AI 파이프라인 모니터링 섹션 ─── */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI 파이프라인 모니터링</h2>
            <p className="text-sm text-muted-foreground">
              5개 위젯으로 AI 파이프라인 건강도 실시간 추적
            </p>
          </div>
          <Badge variant="outline">v2.2</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* 위젯 1: AI 동의 통계 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI 동의 통계</CardTitle>
              <Link
                href="/admin/ai/consent-stats"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                자세히
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{fmtPercent(overview?.consentRate)}</div>
              <p className="text-xs text-muted-foreground">AI 분석 동의율</p>
              <p className="text-xs text-muted-foreground">
                30초마다 자동 갱신
              </p>
            </CardContent>
          </Card>

          {/* 위젯 2: MQ/DLQ 모니터링 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MQ/DLQ 모니터링</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleDlqReprocess}>
                  DLQ 재처리
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <Link href="/admin/ai/mq" className="text-2xl font-bold hover:underline">
                DLQ {fmtNum(overview?.dlqSize)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {mqStatus?.queues?.length ?? 0}개 큐 실시간 모니터링
              </p>
              <p className="text-xs">
                <Link href="/admin/ai/mq" className="text-primary underline-offset-2 hover:underline">
                  큐별 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 3: OutboxRelay 상태 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OutboxRelay 상태</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleOutboxRetry}>
                  Outbox 재시도
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex gap-3 text-sm">
                <span>
                  PENDING{' '}
                  <span className="font-bold">{fmtNum(overview?.outboxPending)}</span>
                </span>
                <span>
                  FAILED{' '}
                  <span className="font-bold text-destructive">{fmtNum(overview?.outboxFailed)}</span>
                </span>
              </div>
              <p className="text-xs">
                <Link href="/admin/ai/outbox" className="text-primary underline-offset-2 hover:underline">
                  Outbox 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 4: Redis 캐시 건강도 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Redis 캐시 건강도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold text-success">{fmtPercent(overview?.redisHitRatio)}</div>
              <p className="text-xs text-muted-foreground">Hit Ratio</p>
              {redisHealth && (
                <p className="text-xs text-muted-foreground">
                  메모리: {redisHealth.memoryUsedMb}MB / {redisHealth.memoryPeakMb}MB
                </p>
              )}
              <p className="text-xs">
                <Link href="/admin/ai/redis" className="text-primary underline-offset-2 hover:underline">
                  캐시 패턴 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 5: 일기/리포트 분석 상태 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">분석 상태</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleForceFailDiary}>
                  강제 FAILED 전이
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex gap-3 text-sm">
                <span>
                  처리중{' '}
                  <span className="font-bold">{fmtNum(overview?.analysisProcessing)}</span>
                </span>
                <span>
                  실패{' '}
                  <span className="font-bold text-destructive">{fmtNum(overview?.analysisFailed)}</span>
                </span>
              </div>
              {analysisOverview && (
                <p className="text-xs text-muted-foreground">
                  완료: {analysisOverview.diary?.done?.toLocaleString() ?? '—'}건
                </p>
              )}
              <p className="text-xs">
                <Link href="/admin/ai/analysis" className="text-primary underline-offset-2 hover:underline">
                  분석 상태 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          title="키워드 정확도"
          value={keywordAccuracy != null ? `${(keywordAccuracy * (keywordAccuracy <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}
          description="KcELECTRA 평균"
          icon={Brain}
          valueClassName="text-primary"
        />
        <KpiCard
          title="매칭 성공률"
          value={matchSuccessRate != null ? `${(matchSuccessRate * (matchSuccessRate <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}
          description="교환일기 진행률"
          icon={Target}
          valueClassName="text-info"
        />
        <KpiCard
          title="일일 분석량"
          value={dailyAnalysisCount ?? '—'}
          description="오늘 처리된 일기"
          icon={TrendingUp}
        />
        <KpiCard
          title="평균 유사도"
          value={avgSimilarity != null ? Number(avgSimilarity).toFixed(2) : '—'}
          description="KoSimCSE 스코어"
          icon={Activity}
          valueClassName="text-success"
        />
        <KpiCard
          title="추출 키워드"
          value={dailyKeywordCount ?? '—'}
          description="오늘 추출된 키워드"
          icon={Zap}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {keywordDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>키워드 카테고리별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={keywordDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="positive" name="긍정" fill="#22c55e" stackId="a" />
                  <Bar dataKey="neutral" name="중립" fill="#6b7280" stackId="a" />
                  <Bar dataKey="negative" name="부정" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {similarityDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>매칭 유사도 분포 (KoSimCSE)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={similarityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}건`, '매칭 수']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매칭 수" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {emotionDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>감정 분석 레이더</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={emotionDistribution}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="emotion" stroke="#6b7280" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#6b7280" fontSize={10} />
                  <Radar
                    name="감정 점수"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#c4b5fd"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI 모델 성능 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-around">
              {modelPerformanceData.map((model) => (
                <GaugeChart
                  key={model.name}
                  value={model.value}
                  color={model.color}
                  label={model.name}
                  description={model.description}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
