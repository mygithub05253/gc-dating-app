'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/common/KpiCard';
import {
  Lightbulb,
  TrendingUp,
  Crown,
  Grid,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useDiaryTopicParticipation } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { DiaryTopicParticipationResponse, TopicRow } from '@/types/analytics';

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b',
  '#06b6d4', '#6366f1', '#84cc16', '#f97316', '#14b8a6',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

function shareColor(rate: number): string {
  if (rate >= 0.6) return '#10b981';
  if (rate >= 0.3) return '#3b82f6';
  return '#f59e0b';
}

export default function DiaryTopicPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useDiaryTopicParticipation({ startDate, endDate });
  const data: DiaryTopicParticipationResponse | undefined = query.data;

  // adapter: BE topics → 차트 데이터 (diaryShare 내림차순)
  const sortedTopics = useMemo(() => {
    if (!data) return [];
    return [...data.topics].sort((a, b) => (b.diaryShare ?? 0) - (a.diaryShare ?? 0));
  }, [data]);

  // 가로 BarChart는 오름차순이 보기 좋다
  const barData = useMemo(() => {
    return [...sortedTopics]
      .sort((a, b) => (a.diaryShare ?? 0) - (b.diaryShare ?? 0))
      .map((t) => ({
        topic: t.category.length > 14 ? t.category.slice(0, 13) + '…' : t.category,
        rate: ((t.diaryShare ?? 0) * 100),
      }));
  }, [sortedTopics]);

  const pieData = useMemo(() => {
    return sortedTopics.map((t, idx) => ({
      name: t.category,
      value: t.diaryCount,
      share: ((t.diaryShare ?? 0) * 100),
      color: PALETTE[idx % PALETTE.length],
    }));
  }, [sortedTopics]);

  const top1 = sortedTopics[0];
  const avgShare = sortedTopics.length > 0
    ? (sortedTopics.reduce((s, t) => s + (t.diaryShare ?? 0), 0) / sortedTopics.length) * 100
    : 0;

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="일기 주제 참여율"
        description="AI 카테고리별 응답률·인기도 분석"
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
              title="총 카테고리 수"
              value={sortedTopics.length}
              description="현재 노출 중인 주제 수"
              icon={Lightbulb}
            />
            <KpiCard
              title="평균 점유율"
              value={`${avgShare.toFixed(1)}%`}
              description="카테고리 평균 일기 점유율"
              icon={TrendingUp}
              valueClassName="text-primary"
            />
            <KpiCard
              title="Top 1 카테고리"
              value={top1?.category ?? '—'}
              description={top1 ? `${top1.diaryCount.toLocaleString()}건` : '데이터 없음'}
              icon={Crown}
              valueClassName="text-[#f59e0b] text-2xl"
            />
            <KpiCard
              title="총 일기 수"
              value={data.totalDiaries.toLocaleString()}
              description={`참여 사용자 ${data.totalUsers.toLocaleString()}명`}
              icon={Grid}
            />
          </div>

          {sortedTopics.length === 0 ? (
            <AnalyticsEmpty height={300} title="주제 참여 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">카테고리별 일기 점유율 — 가로 막대</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    60%+ emerald, 30%+ blue, 미만 amber
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={520}>
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 4, right: 48, left: 16, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        width={100}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v.toFixed(1)}%`, '점유율']}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      <Bar dataKey="rate" name="점유율" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={shareColor(entry.rate / 100)} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">AI 카테고리별 응답 분포</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      KcELECTRA category 필드 기준
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={40}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, share }: { name: string; share: number }) =>
                            `${name} ${share.toFixed(1)}%`
                          }
                          labelLine={false}
                          fontSize={10}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`pie-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, name: string) => [`${v.toLocaleString()}건`, name]}
                          contentStyle={TOOLTIP_STYLE}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">카테고리별 사용자 점유율</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">userShare 기준</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={sortedTopics.map((t) => ({
                          name: t.category,
                          rate: ((t.userShare ?? 0) * 100),
                        }))}
                        margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                          formatter={(v: number) => [`${v.toFixed(1)}%`, '사용자 점유율']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="rate" fill="#3b82f6" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">카테고리 상세 현황</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    일기 점유율 내림차순 / category = KcELECTRA AI 분류 결과
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">카테고리</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">일기 수</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">사용자 수</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">일기 점유율</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">사용자 점유율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTopics.map((row: TopicRow, idx) => (
                        <tr
                          key={row.category}
                          className="border-b border-border transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-2.5 text-muted-foreground font-mono-data">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{
                                borderColor: PALETTE[idx % PALETTE.length],
                                color: PALETTE[idx % PALETTE.length],
                              }}
                            >
                              {row.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono-data">
                            {row.diaryCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono-data text-muted-foreground">
                            {row.userCount.toLocaleString()}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right font-mono-data font-medium"
                            style={{ color: shareColor(row.diaryShare ?? 0) }}
                          >
                            {((row.diaryShare ?? 0) * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono-data text-muted-foreground">
                            {((row.userShare ?? 0) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
