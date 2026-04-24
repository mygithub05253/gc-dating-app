'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import {
  Sparkles,
  Layers,
  Activity,
  Scale,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useMatchingDiversity } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { MatchingDiversityResponse, DiversityDailyPoint } from '@/types/analytics';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

export default function DiversityAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useMatchingDiversity({ startDate, endDate });
  const data: MatchingDiversityResponse | undefined = query.data;

  // adapter: BE daily → 차트 데이터
  const trendData = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d: DiversityDailyPoint) => ({
      date: d.date,
      entropy: d.shannonEntropy ?? 0,
      uniquePairs: d.uniquePairs,
      totalRecs: d.totalRecommendations,
    }));
  }, [data]);

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="다양성 지표"
        description="매칭 추천 다양성 (Shannon 엔트로피) + 재추천율 분석"
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
              title="평균 Shannon 엔트로피"
              value={(data.avgShannonEntropy ?? 0).toFixed(2)}
              description="기간 평균 매칭 다양성 점수"
              icon={Sparkles}
              valueClassName="text-primary"
            />
            <KpiCard
              title="재추천율"
              value={`${((data.rerecommendationRate ?? 0) * 100).toFixed(1)}%`}
              description={`최근 ${data.rerecommendationWindowDays}일 윈도우 내 동일 페어 재추천`}
              icon={Layers}
            />
            <KpiCard
              title="총 추천 수"
              value={trendData.reduce((s, d) => s + d.totalRecs, 0).toLocaleString()}
              description="기간 누적 추천 횟수"
              icon={Activity}
              valueClassName="text-[#10b981]"
            />
            <KpiCard
              title="고유 매칭 페어"
              value={trendData.reduce((s, d) => s + d.uniquePairs, 0).toLocaleString()}
              description="고유 (사용자, 후보) 조합 합계"
              icon={Scale}
            />
          </div>

          {trendData.length === 0 ? (
            <AnalyticsEmpty height={300} title="다양성 지표 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">매칭 다양성 추이 (Shannon Entropy)</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    일별 추천 결과 분포의 엔트로피. 값이 높을수록 추천이 다양함.
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        interval={Math.max(1, Math.floor(trendData.length / 8))}
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(v: number) => [v.toFixed(3), 'Shannon H']}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="entropy"
                        name="Shannon 엔트로피"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">일별 고유 페어 수</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          interval={Math.max(1, Math.floor(trendData.length / 8))}
                        />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString(), '고유 페어']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="uniquePairs" fill="#3b82f6" fillOpacity={0.85} radius={[4, 4, 0, 0]}>
                          {trendData.map((_, idx) => (
                            <Cell key={`p-${idx}`} fill="#3b82f6" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">일별 총 추천 수</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          interval={Math.max(1, Math.floor(trendData.length / 8))}
                        />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString(), '총 추천']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="totalRecs" fill="#10b981" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
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
