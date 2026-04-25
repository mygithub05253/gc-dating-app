'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, Activity, Crown, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useSegmentOverview } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { SegmentOverviewResponse, SegmentMetric, SegmentRow } from '@/types/analytics';

const PALETTE = [
  '#10b981', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
  '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

function retentionColor(v: number): string {
  if (v >= 70) return 'text-emerald-600';
  if (v >= 50) return 'text-blue-500';
  if (v >= 30) return 'text-amber-500';
  return 'text-red-500';
}

function describeRow(row: SegmentRow): string {
  const parts: string[] = [];
  if (row.gender) parts.push(row.gender === 'M' ? '남성' : row.gender === 'F' ? '여성' : row.gender);
  if (row.ageGroup) parts.push(row.ageGroup);
  if (row.regionCode) parts.push(row.regionCode);
  return parts.length > 0 ? parts.join(' · ') : '미분류';
}

export default function SegmentAnalysisPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [metric, setMetric] = useState<SegmentMetric>('SIGNUP');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useSegmentOverview({
    startDate,
    endDate,
    metric,
    groupBy: ['gender', 'ageGroup'],
  });
  const data: SegmentOverviewResponse | undefined = query.data;

  // adapter: BE rows → 차트 데이터
  const chartRows = useMemo(() => {
    if (!data) return [];
    return (data.rows ?? []).map((r, idx) => ({
      label: describeRow(r),
      value: r.value,
      share: ((r.share ?? 0) * 100),
      masked: r.masked,
      color: PALETTE[idx % PALETTE.length],
    }));
  }, [data]);

  // 성별 × 연령 stacked 데이터
  const genderAgeData = useMemo(() => {
    if (!data) return [];
    const byAge = new Map<string, { age: string; M: number; F: number }>();
    (data.rows ?? []).forEach((r) => {
      const age = r.ageGroup ?? '미상';
      if (!byAge.has(age)) byAge.set(age, { age, M: 0, F: 0 });
      const entry = byAge.get(age)!;
      if (r.gender === 'M') entry.M += r.value;
      else if (r.gender === 'F') entry.F += r.value;
    });
    return Array.from(byAge.values()).sort((a, b) => a.age.localeCompare(b.age));
  }, [data]);

  const top1 = chartRows[0];
  const handleExport = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  const periodLabel: Record<AnalyticsPeriod, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  const metricLabel: Record<SegmentMetric, string> = {
    SIGNUP: '가입',
    ACTIVE: '활성',
    DIARY: '일기',
    ACCEPT: '매칭 수락',
  };

  return (
    <div>
      <PageHeader
        title="세그먼트 분석"
        description="성별·연령·지역 사용자 세그먼테이션 (Star CTE)"
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as SegmentMetric)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {(['SIGNUP', 'ACTIVE', 'DIARY', 'ACCEPT'] as SegmentMetric[]).map((m) => (
                <option key={m} value={m}>
                  {metricLabel[m]}
                </option>
              ))}
            </select>
            {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {periodLabel[p]}
              </Button>
            ))}
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
              title="총 세그먼트 수"
              value={chartRows.length}
              description={`${periodLabel[period]} · ${metricLabel[metric]} 기준`}
              icon={Users}
            />
            <KpiCard
              title="최대 세그먼트"
              value={top1?.label ?? '—'}
              description={
                top1
                  ? `${top1.value.toLocaleString()} · ${top1.share.toFixed(1)}%`
                  : '데이터 없음'
              }
              icon={Target}
              valueClassName="text-primary text-xl"
            />
            <KpiCard
              title="총 사용자"
              value={data.total.toLocaleString()}
              description="기간 내 합계"
              icon={Activity}
              valueClassName="text-emerald-600"
            />
            <KpiCard
              title="마스킹 세그먼트"
              value={data.maskedCount.toLocaleString()}
              description={`k-anonymity ≥ ${data.meta.kAnonymityMin ?? '?'}`}
              icon={Crown}
              valueClassName={data.maskedCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}
            />
          </div>

          {chartRows.length === 0 ? (
            <AnalyticsEmpty height={300} title="세그먼트 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{metricLabel[metric]} 세그먼트 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartRows} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        stroke="#6b7280"
                        fontSize={11}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(v: number) => v.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number) => [value.toLocaleString() + '명', '사용자 수']}
                      />
                      <Bar dataKey="value" name="사용자 수" radius={[4, 4, 0, 0]}>
                        {chartRows.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>성별 × 연령대 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={genderAgeData}
                        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="age" stroke="#6b7280" fontSize={12} />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={12}
                          tickFormatter={(v: number) => v.toLocaleString()}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                          formatter={(value: number) => [value.toLocaleString() + '명']}
                        />
                        <Legend />
                        <Bar dataKey="M" name="남성" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="F" name="여성" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>세그먼트 점유율 (Top 8)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={chartRows.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          nameKey="label"
                          label={({ label, share }: { label: string; share: number }) =>
                            `${label} ${share.toFixed(1)}%`
                          }
                          labelLine={false}
                          fontSize={10}
                        >
                          {chartRows.slice(0, 8).map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                          formatter={(value: number, name: string) => [`${value.toLocaleString()}명`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>세그먼트 상세</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 grid grid-cols-[1fr_120px_120px_120px] gap-2 border-b border-border pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span>세그먼트</span>
                    <span className="text-right">값</span>
                    <span className="text-right">점유율</span>
                    <span className="text-right">상태</span>
                  </div>
                  <div className="divide-y divide-border">
                    {chartRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_120px_120px_120px] items-center gap-2 py-2.5 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.label}
                        </span>
                        <span className="text-right tabular-nums">{row.value.toLocaleString()}</span>
                        <span className={`text-right tabular-nums font-medium ${retentionColor(row.share)}`}>
                          {row.share.toFixed(1)}%
                        </span>
                        <span className="text-right text-xs text-muted-foreground">
                          {row.masked ? '마스킹됨 (k-anon)' : '공개'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
