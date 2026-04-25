'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Heart, Activity, Clock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useRetentionSurvival } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { RetentionSurvivalResponse, SurvivalPoint } from '@/types/analytics';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
};

export default function FunnelDeepPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [inactivityDays, setInactivityDays] = useState<number>(7);

  const { startDate, endDate } = periodToDateRange(period);
  const query = useRetentionSurvival({ startDate, endDate, inactivityDays });
  const data: RetentionSurvivalResponse | undefined = query.data;

  // adapter: BE curve(SurvivalPoint[]) → 차트 데이터
  // 신뢰구간 표시를 위해 ciLower / ciUpper 함께 매핑
  const curveData = useMemo(() => {
    if (!data) return [];
    return (data?.curve ?? []).map((p: SurvivalPoint) => ({
      day: p.day,
      survival: p.survivalProbability ?? 0,
      ciLower: p.ciLower ?? 0,
      ciUpper: p.ciUpper ?? 0,
      atRisk: p.atRisk,
      events: p.events,
    }));
  }, [data]);

  // D7 / D30 KPI: curve에서 가장 가까운 day 찾기
  const findNearest = (target: number) => {
    if (!data) return null;
    return (data?.curve ?? []).reduce<SurvivalPoint | null>((best, p) => {
      if (!best) return p;
      return Math.abs(p.day - target) < Math.abs(best.day - target) ? p : best;
    }, null);
  };

  const d7 = findNearest(7);
  const d30 = findNearest(30);

  const handleExport = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="퍼널 심화 분석"
        description="Kaplan-Meier 생존 분석 (가입 후 N일 활성 잔존율)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors duration-short ${
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </button>
              ))}
            </div>

            <select
              value={inactivityDays}
              onChange={(e) => setInactivityDays(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={3}>이탈 기준: 3일</option>
              <option value={7}>이탈 기준: 7일</option>
              <option value={14}>이탈 기준: 14일</option>
              <option value={30}>이탈 기준: 30일</option>
            </select>

            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
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
              title={`D${d7?.day ?? 7} 생존율`}
              value={`${((d7?.survivalProbability ?? 0) * 100).toFixed(1)}%`}
              description="가입 후 7일차 활성 잔존율"
              icon={Heart}
              valueClassName="text-primary"
            />
            <KpiCard
              title={`D${d30?.day ?? 30} 생존율`}
              value={`${((d30?.survivalProbability ?? 0) * 100).toFixed(1)}%`}
              description="가입 후 30일차 활성 잔존율"
              icon={Activity}
              valueClassName="text-blue-500"
            />
            <KpiCard
              title="중앙 생존 시간"
              value={data.medianSurvivalDay !== null ? `${data.medianSurvivalDay}일` : '미정의'}
              description="50% 사용자 생존 시점 (Median)"
              icon={Clock}
            />
            <KpiCard
              title="코호트 / 이탈"
              value={`${data.eventCount.toLocaleString()} / ${data.cohortSize.toLocaleString()}`}
              description={`센서드 ${data.censoredCount.toLocaleString()}명 · ${data.meta.algorithm}`}
              icon={Crown}
              valueClassName="text-amber-500"
            />
          </div>

          {curveData.length === 0 ? (
            <AnalyticsEmpty height={300} title="생존 분석 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Kaplan-Meier 생존 곡선</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    이벤트 정의: {data.meta.eventDefinition} · 알고리즘: {data.meta.algorithm}
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={curveData} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="day"
                        stroke="#6b7280"
                        fontSize={12}
                        label={{ value: '가입 후 일수', position: 'insideBottomRight', offset: -8, fontSize: 11, fill: '#9ca3af' }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                        stroke="#6b7280"
                        fontSize={12}
                        label={{ value: '생존 확률', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${(value * 100).toFixed(1)}%`,
                          name === 'survival' ? '생존율' : name === 'ciLower' ? 'CI 하한' : 'CI 상한',
                        ]}
                        labelFormatter={(label: number) => `D+${label}`}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="survival"
                        name="생존율"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ciLower"
                        name="CI 하한 (95%)"
                        stroke="#93c5fd"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="ciUpper"
                        name="CI 상한 (95%)"
                        stroke="#93c5fd"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">일별 이탈 이벤트</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={curveData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value: number) => [value.toLocaleString() + '명', '이탈']}
                          labelFormatter={(label: number) => `D+${label}`}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="events"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">일별 위험 집합 (At Risk)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={curveData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value: number) => [value.toLocaleString() + '명', 'At Risk']}
                          labelFormatter={(label: number) => `D+${label}`}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="atRisk"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
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
