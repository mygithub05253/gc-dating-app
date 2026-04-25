'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import {
  Clock,
  Timer,
  AlertCircle,
  Zap,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useExchangeResponseRate } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { ExchangeResponseRateResponse } from '@/types/analytics';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

function rateColor(rate: number): string {
  if (rate >= 0.8) return '#10b981';
  if (rate >= 0.6) return '#3b82f6';
  if (rate >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export default function DiaryResponsePage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useExchangeResponseRate({ startDate, endDate, windowHours: 48 });
  const data: ExchangeResponseRateResponse | undefined = query.data;

  // adapter: BE turnRows → 차트 데이터
  const turnBarData = useMemo(() => {
    if (!data) return [];
    return (data.turnRows ?? []).map((r) => ({
      turn: `${r.turn}턴`,
      responded: r.responded,
      timedOut: r.timedOut,
      rate: r.rate ?? 0,
      p50: r.delay.p50Hours ?? 0,
      p90: r.delay.p90Hours ?? 0,
    }));
  }, [data]);

  const totalResponded = useMemo(
    () => (data ? (data.turnRows ?? []).reduce((s, r) => s + r.responded, 0) : 0),
    [data],
  );
  const totalTimedOut = useMemo(
    () => (data ? (data.turnRows ?? []).reduce((s, r) => s + r.timedOut, 0) : 0),
    [data],
  );
  const totalAttempts = totalResponded + totalTimedOut;
  const expireRate = totalAttempts > 0 ? (totalTimedOut / totalAttempts) * 100 : 0;

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="교환일기 응답률"
        description="교환일기 턴별 응답 시간·완료율·만료율 분석"
        actions={
          <>
            <div className="flex gap-1 rounded-md border border-border p-1">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={query.isFetching ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'} />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </>
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
              title="평균 응답 시간 (P50)"
              value={`${(data.overallDelay.p50Hours ?? 0).toFixed(1)}시간`}
              description={`P90 ${(data.overallDelay.p90Hours ?? 0).toFixed(1)}h · P99 ${(data.overallDelay.p99Hours ?? 0).toFixed(1)}h`}
              icon={Clock}
            />
            <KpiCard
              title="첫 응답률"
              value={`${((data.firstResponseRate ?? 0) * 100).toFixed(1)}%`}
              description={`${data.windowHours}시간 윈도우 기준`}
              icon={Zap}
              valueClassName="text-emerald-500"
            />
            <KpiCard
              title="만료율"
              value={`${expireRate.toFixed(1)}%`}
              description={`만료 ${totalTimedOut.toLocaleString()} / 총 ${totalAttempts.toLocaleString()}`}
              icon={AlertCircle}
              valueClassName="text-destructive"
            />
            <KpiCard
              title="P99 응답 시간"
              value={`${(data.overallDelay.p99Hours ?? 0).toFixed(1)}시간`}
              description="가장 늦은 1% 응답 기준"
              icon={Timer}
              valueClassName="text-primary"
            />
          </div>

          {turnBarData.length === 0 ? (
            <AnalyticsEmpty height={300} title="응답 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">턴별 응답 vs 만료 (Stacked)</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    각 턴에서 시간 내 응답한 건수와 만료된 건수
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={turnBarData} margin={{ top: 16, right: 24, left: -8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="turn" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v: number) => v.toLocaleString()}
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => [v.toLocaleString() + '건', name === 'responded' ? '응답' : '만료']}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value: string) => (value === 'responded' ? '응답' : '만료')}
                      />
                      <Bar dataKey="responded" name="responded" stackId="a" fill="#10b981" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="timedOut" name="timedOut" stackId="a" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">턴별 응답률</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">응답 / (응답 + 만료)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={turnBarData} margin={{ top: 4, right: 12, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="turn" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis
                          domain={[0, 1]}
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, '응답률']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                          {turnBarData.map((entry, idx) => (
                            <Cell key={`r-${idx}`} fill={rateColor(entry.rate)} fillOpacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">턴별 응답 지연 P50/P90</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">시간 단위 (h)</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={turnBarData} margin={{ top: 4, right: 12, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="turn" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `${v}h`} />
                        <Tooltip
                          formatter={(v: number, name: string) => [`${v.toFixed(1)}h`, name === 'p50' ? 'P50 (중앙값)' : 'P90']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          formatter={(value: string) => (value === 'p50' ? 'P50 (중앙값)' : 'P90')}
                        />
                        <Bar dataKey="p50" name="p50" fill="#3b82f6" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="p90" name="p90" fill="#8b5cf6" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
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
