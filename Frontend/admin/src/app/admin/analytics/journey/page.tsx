'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import {
  RefreshCw,
  Download,
  ArrowRight,
  Footprints,
  Clock,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useJourneyDurations } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { JourneyDurationResponse, JourneyStageDuration } from '@/types/analytics';

const STAGE_COLORS = ['#3b82f6', '#60a5fa', '#818cf8', '#a78bfa', '#c4b5fd', '#ddd6fe'];

const STAGE_LABEL_MAP: Record<string, string> = {
  'signup->profile': '가입 → 프로필',
  'profile->match': '프로필 → 매칭',
  'match->exchange': '매칭 → 교환',
  'exchange->couple': '교환 → 커플',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

export default function JourneyAnalysisPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useJourneyDurations({ startDate, endDate });
  const data: JourneyDurationResponse | undefined = query.data;

  // adapter: percentile 분포를 BarChart 데이터로 변환
  const barData = useMemo(() => {
    if (!data) return [];
    return (data.stages ?? []).map((s: JourneyStageDuration, idx: number) => ({
      stage: STAGE_LABEL_MAP[s.stage] ?? s.stage,
      stageKey: s.stage,
      p50: s.p50Hours ?? 0,
      p90: s.p90Hours ?? 0,
      p99: s.p99Hours ?? 0,
      sampleSize: s.sampleSize,
      color: STAGE_COLORS[idx % STAGE_COLORS.length],
    }));
  }, [data]);

  // KPI 계산
  const avgP50 = barData.length > 0
    ? barData.reduce((s, d) => s + d.p50, 0) / barData.length
    : 0;
  const longestStage = useMemo(() => {
    if (barData.length === 0) return null;
    return barData.reduce((a, b) => (a.p50 > b.p50 ? a : b));
  }, [barData]);
  const totalSamples = barData.reduce((s, d) => s + d.sampleSize, 0);

  const handleExport = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  const periodLabel: Record<AnalyticsPeriod, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  return (
    <div>
      <PageHeader
        title="사용자 여정 분석"
        description="가입→프로필→매칭→교환→커플 여정 단계별 소요 시간"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm transition-colors duration-short ${
                    period === p
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-background text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </div>
        }
      />

      {data?.meta?.degraded && (
        <div className="mb-4">
          <DegradedBadge degraded={data.meta.degraded} reason={data.meta.algorithm} />
        </div>
      )}

      {query.isLoading && <AnalyticsLoading height={400} />}
      {query.isError && (
        <AnalyticsError
          height={400}
          message={(query.error as Error)?.message}
          onRetry={() => query.refetch()}
        />
      )}

      {data && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="여정 단계 수"
              value={barData.length}
              description={`기간: ${periodLabel[period]} 기준`}
              icon={Footprints}
            />
            <KpiCard
              title="평균 소요 시간 (P50)"
              value={`${avgP50.toFixed(1)}h`}
              description="단계별 P50 평균"
              icon={Clock}
            />
            <KpiCard
              title="가장 긴 단계 (P50)"
              value={longestStage?.stage ?? '—'}
              description={longestStage ? `${longestStage.p50.toFixed(1)}h` : '데이터 없음'}
              icon={MapPin}
            />
            <KpiCard
              title="총 샘플 수"
              value={totalSamples.toLocaleString()}
              description="전 단계 누적 사용자"
              icon={CheckCircle}
              valueClassName="text-primary"
            />
          </div>

          {barData.length === 0 ? (
            <AnalyticsEmpty height={300} title="여정 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>여정 단계 흐름 (각 단계 P50 / P90 / P99)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-center gap-2 py-2 overflow-x-auto">
                    {barData.map((stage, idx) => (
                      <div key={stage.stageKey} className="flex items-center">
                        <div
                          className="flex flex-col items-center rounded-xl p-4 min-w-[140px] shadow-sm border border-border/50"
                          style={{ background: `${stage.color}22` }}
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm text-sm font-bold text-white"
                            style={{ backgroundColor: stage.color }}
                          >
                            {idx + 1}
                          </div>
                          <span className="mt-2 text-xs font-semibold text-foreground text-center">
                            {stage.stage}
                          </span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            P50 <strong className="text-foreground">{stage.p50.toFixed(1)}h</strong>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            P90 {stage.p90.toFixed(1)}h
                          </span>
                          <span className="text-xs text-muted-foreground">
                            n = {stage.sampleSize.toLocaleString()}
                          </span>
                        </div>
                        {idx < barData.length - 1 && (
                          <ArrowRight className="mx-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>단계별 P50 / P90 / P99 (시간)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="stage"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={9}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          unit="h"
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value: number, name: string) => [`${value.toFixed(1)}h`, name.toUpperCase()]}
                        />
                        <Legend />
                        <Bar dataKey="p50" fill="#3b82f6" name="p50" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="p90" fill="#8b5cf6" name="p90" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="p99" fill="#ef4444" name="p99" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>단계별 샘플 수</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="stage"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={9}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value: number) => [value.toLocaleString(), '샘플 수']}
                        />
                        <Bar dataKey="sampleSize" radius={[4, 4, 0, 0]}>
                          {barData.map((entry) => (
                            <Cell key={entry.stageKey} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
