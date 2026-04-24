'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, Repeat, Sparkles, RefreshCw, Download } from 'lucide-react';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useKeywordTop } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { KeywordItem, KeywordTagType, KeywordTopResponse } from '@/types/analytics';

// ─── 카테고리(tagType) 색상 팔레트 ─────────────────────────────
// BE의 KeywordTagType: EMOTION / LIFESTYLE / RELATIONSHIP_STYLE / TONE / ALL
const TAG_TYPE_COLORS: Record<string, string> = {
  EMOTION: '#3b82f6',
  LIFESTYLE: '#60a5fa',
  RELATIONSHIP_STYLE: '#93c5fd',
  TONE: '#bfdbfe',
  ALL: '#dbeafe',
};

const TAG_TYPE_LABELS: Record<string, string> = {
  EMOTION: '감정',
  LIFESTYLE: '라이프스타일',
  RELATIONSHIP_STYLE: '관계',
  TONE: '톤',
  ALL: '전체',
};

const TAG_TYPE_OPTIONS: KeywordTagType[] = ['ALL', 'EMOTION', 'LIFESTYLE', 'RELATIONSHIP_STYLE', 'TONE'];

// ─── BE 응답 → 차트별 adapter ──────────────────────────────────
function adaptItems(items: KeywordItem[]) {
  return items.map((it, idx) => ({
    rank: idx + 1,
    keyword: it.label,
    category: TAG_TYPE_LABELS[it.tagType] ?? it.tagType,
    tagType: it.tagType,
    frequency: it.count,
    diaryCount: it.diaryCount,
    userCount: it.userCount,
    share: it.share ?? 0,
    masked: it.masked,
  }));
}

function buildBarData(rows: ReturnType<typeof adaptItems>) {
  return rows.slice(0, 20).map((k) => ({ keyword: k.keyword, 빈도: k.frequency }));
}

function buildPieData(rows: ReturnType<typeof adaptItems>) {
  const grouped = rows.reduce<Record<string, number>>((acc, k) => {
    acc[k.category] = (acc[k.category] ?? 0) + k.frequency;
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}

// 트렌드는 BE에서 미제공 — 현재 응답 기준 정적 표시 (placeholder).
// 실 트렌드 API가 추가되기 전까지 Top5 키워드 단일 시점 막대로 보여준다.
function buildTrendData(rows: ReturnType<typeof adaptItems>) {
  const top5 = rows.slice(0, 5);
  return [{ date: '현재', ...Object.fromEntries(top5.map((k) => [k.keyword, k.frequency])) }];
}

const TREND_LINE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8'];

// ─── 페이지 컴포넌트 ──────────────────────────────────────────
export default function KeywordsAnalysisPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [tagType, setTagType] = useState<KeywordTagType>('ALL');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useKeywordTop({ startDate, endDate, tagType, limit: 30 });

  const data: KeywordTopResponse | undefined = query.data;
  const rows = useMemo(() => (data ? adaptItems(data.items) : []), [data]);
  const barData = useMemo(() => buildBarData(rows), [rows]);
  const pieData = useMemo(() => buildPieData(rows), [rows]);
  const trendData = useMemo(() => buildTrendData(rows), [rows]);
  const top5Keywords = useMemo(() => rows.slice(0, 5).map((k) => k.keyword), [rows]);

  const handleExport = () => {
    toast.success('키워드 분석 리포트 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  const periodLabel: Record<AnalyticsPeriod, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  return (
    <div>
      <PageHeader
        title="키워드 분석"
        description="일기/프로필 키워드 트렌드 및 인기도 분석"
        actions={
          <div className="flex flex-wrap gap-2">
            {/* 태그 타입 필터 */}
            <select
              value={tagType}
              onChange={(e) => setTagType(e.target.value as KeywordTagType)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TAG_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TAG_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            {/* 기간 토글 */}
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
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
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

      {/* degraded 배지 */}
      {data?.meta?.degraded && (
        <div className="mb-4">
          <DegradedBadge degraded={data.meta.degraded} reason={data.meta.algorithm} />
        </div>
      )}

      {/* 로딩/에러 상태 */}
      {query.isLoading && <AnalyticsLoading height={300} />}
      {query.isError && (
        <AnalyticsError
          height={300}
          message={(query.error as Error)?.message}
          onRetry={() => query.refetch()}
        />
      )}

      {data && (
        <>
          {/* KPI 카드 4개 */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="총 키워드 수"
              value={rows.length}
              description={`${periodLabel[period]} 집계 기준`}
              icon={Hash}
            />
            <KpiCard
              title="Top 1 키워드"
              value={rows[0]?.keyword ?? '—'}
              description={rows[0] ? `빈도 ${rows[0].frequency.toLocaleString()}회` : '데이터 없음'}
              icon={TrendingUp}
              valueClassName="text-primary"
            />
            <KpiCard
              title="총 사용 횟수"
              value={data.totalCount.toLocaleString()}
              description="기간 내 전체 키워드 사용 합계"
              icon={Repeat}
            />
            <KpiCard
              title="평균 사용 빈도"
              value={
                rows.length
                  ? Math.round(rows.reduce((s, k) => s + k.frequency, 0) / rows.length)
                  : 0
              }
              description="키워드 1개당 평균 사용 횟수"
              icon={Sparkles}
              valueClassName="text-success"
            />
          </div>

          {rows.length === 0 ? (
            <AnalyticsEmpty
              height={300}
              title="표시할 키워드가 없습니다"
              description="기간 또는 태그 필터를 조정해 보세요."
            />
          ) : (
            <>
              {/* 메인 차트: 키워드 빈도 BarChart Top 20 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>키워드 빈도 Top 20 (가로 막대)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={520}>
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 56, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(v: number) => v.toLocaleString()}
                      />
                      <YAxis
                        type="category"
                        dataKey="keyword"
                        stroke="#6b7280"
                        fontSize={12}
                        width={52}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number) => [value.toLocaleString() + '회', '사용 빈도']}
                      />
                      <Bar dataKey="빈도" radius={[0, 4, 4, 0]}>
                        {barData.map((_, index) => {
                          const colors = [
                            '#3b82f6', '#4589f7', '#5093f8', '#5a9df9', '#60a5fa',
                            '#6aaefb', '#74b7fc', '#7ec0fd', '#88c9fe', '#93c5fd',
                            '#9dcefe', '#a7d7ff', '#b1e0ff', '#bce9ff', '#bfdbfe',
                            '#c9e4ff', '#d3edff', '#ddf6ff', '#dbeafe', '#e5f3ff',
                          ];
                          return <Cell key={index} fill={colors[index] ?? '#dbeafe'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 보조 차트 2개 */}
              <div className="mb-6 grid gap-6 md:grid-cols-2">
                {/* 카테고리별 분포 PieChart */}
                <Card>
                  <CardHeader>
                    <CardTitle>카테고리별 키워드 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }: { name: string; percent: number }) =>
                            `${name} ${(percent * 100).toFixed(1)}%`
                          }
                          labelLine={false}
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={TAG_TYPE_COLORS[entry.name] ?? '#93c5fd'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                          formatter={(value: number) => [value.toLocaleString() + '회', '총 빈도']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 키워드 트렌드 LineChart (백엔드 시계열 미지원 — 현재 시점 단일 표시) */}
                <Card>
                  <CardHeader>
                    <CardTitle>키워드 빈도 (Top 5 현재 시점)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart
                        data={trendData}
                        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={12}
                          domain={['auto', 'auto']}
                          tickFormatter={(v: number) => v.toLocaleString()}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                        <Legend />
                        {top5Keywords.map((kw, i) => (
                          <Line
                            key={kw}
                            type="monotone"
                            dataKey={kw}
                            stroke={TREND_LINE_COLORS[i]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* 키워드 상세 테이블 */}
              <Card>
                <CardHeader>
                  <CardTitle>키워드 상세 (Top {rows.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 헤더 */}
                  <div className="mb-2 grid grid-cols-[40px_1fr_120px_100px_100px] gap-2 border-b border-border pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="text-center">순위</span>
                    <span>키워드</span>
                    <span>카테고리</span>
                    <span className="text-right">사용 빈도</span>
                    <span className="text-right">점유율</span>
                  </div>
                  {/* 행 */}
                  <div className="divide-y divide-border">
                    {rows.map((item) => (
                      <div
                        key={`${item.tagType}-${item.keyword}-${item.rank}`}
                        className="grid grid-cols-[40px_1fr_120px_100px_100px] items-center gap-2 py-2.5 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="text-center font-mono text-muted-foreground">{item.rank}</span>
                        <span className="font-medium text-foreground">
                          {item.masked ? '••• (k-anon)' : item.keyword}
                        </span>
                        <span>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: TAG_TYPE_COLORS[item.tagType] ?? '#93c5fd',
                              color: TAG_TYPE_COLORS[item.tagType] ?? '#93c5fd',
                            }}
                          >
                            {item.category}
                          </Badge>
                        </span>
                        <span className="text-right tabular-nums">{item.frequency.toLocaleString()}</span>
                        <span className="text-right tabular-nums font-medium text-muted-foreground">
                          {(item.share * 100).toFixed(1)}%
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
