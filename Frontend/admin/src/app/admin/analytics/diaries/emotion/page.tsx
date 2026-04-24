'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import {
  Smile,
  Heart,
  Frown,
  Activity,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import { useDiaryEmotionTrends } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { DiaryEmotionTrendResponse } from '@/types/analytics';

// 감정 종류별 색상 (BE 응답 키는 동적이므로 알려진 키들에만 색 매핑)
const EMOTION_COLORS: Record<string, string> = {
  HAPPY: '#10b981',
  JOY: '#10b981',
  LOVE: '#ec4899',
  CALM: '#3b82f6',
  PEACE: '#3b82f6',
  SAD: '#6366f1',
  SADNESS: '#6366f1',
  ANXIOUS: '#f59e0b',
  ANXIETY: '#f59e0b',
  ANGRY: '#ef4444',
  ANGER: '#ef4444',
};

const FALLBACK_PALETTE = [
  '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

const POSITIVE_KEYS = new Set(['HAPPY', 'JOY', 'LOVE', 'CALM', 'PEACE']);
const NEGATIVE_KEYS = new Set(['SAD', 'SADNESS', 'ANXIOUS', 'ANXIETY', 'ANGRY', 'ANGER']);

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

export default function DiaryEmotionPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useDiaryEmotionTrends({ startDate, endDate, bucket: 'day', topN: 6 });
  const data: DiaryEmotionTrendResponse | undefined = query.data;

  const colorFor = (key: string, idx: number) =>
    EMOTION_COLORS[key.toUpperCase()] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

  // adapter: BE points → AreaChart 데이터 (date + 각 감정 키)
  const areaData = useMemo(() => {
    if (!data) return [];
    return data.points.map((p) => {
      const flat: Record<string, number | string> = { date: p.date };
      data.topEmotions.forEach((emo) => {
        flat[emo] = p.counts[emo] ?? 0;
      });
      return flat;
    });
  }, [data]);

  // adapter: PieChart — 전체 기간 감정 합산
  const pieData = useMemo(() => {
    if (!data) return [];
    const totals: Record<string, number> = {};
    data.points.forEach((p) => {
      Object.entries(p.counts).forEach(([k, v]) => {
        totals[k] = (totals[k] ?? 0) + v;
      });
    });
    const sum = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals).map(([key, value]) => ({
      name: key,
      value,
      share: sum > 0 ? (value / sum) * 100 : 0,
      key,
    }));
  }, [data]);

  // KPI 계산
  const dominantEmotion = useMemo(() => {
    if (pieData.length === 0) return { name: '—', share: 0 };
    return pieData.reduce((a, b) => (a.value > b.value ? a : b));
  }, [pieData]);

  const positiveRatio = useMemo(() => {
    const total = pieData.reduce((s, d) => s + d.value, 0);
    if (total === 0) return 0;
    const pos = pieData.filter((d) => POSITIVE_KEYS.has(d.key.toUpperCase())).reduce((s, d) => s + d.value, 0);
    return Math.round((pos / total) * 100);
  }, [pieData]);

  const negativeRatio = useMemo(() => {
    const total = pieData.reduce((s, d) => s + d.value, 0);
    if (total === 0) return 0;
    const neg = pieData.filter((d) => NEGATIVE_KEYS.has(d.key.toUpperCase())).reduce((s, d) => s + d.value, 0);
    return Math.round((neg / total) * 100);
  }, [pieData]);

  // Shannon 엔트로피
  const entropy = useMemo(() => {
    const total = pieData.reduce((s, d) => s + d.value, 0);
    if (total === 0) return '0.00';
    const probs = pieData.map((d) => d.value / total).filter((p) => p > 0);
    const H = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
    return H.toFixed(2);
  }, [pieData]);

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="일기 감정 추이"
        description="KcELECTRA 감정 태그의 시계열 분포 분석"
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
              title="지배적 감정"
              value={`${dominantEmotion.name} ${Math.round(dominantEmotion.share)}%`}
              description="전체 기간 최다 감정 카테고리"
              icon={Smile}
              valueClassName="text-[#10b981]"
            />
            <KpiCard
              title="긍정 감정 비율"
              value={`${positiveRatio}%`}
              description="HAPPY/JOY/LOVE/CALM/PEACE 합산"
              icon={Heart}
              valueClassName="text-[#ec4899]"
            />
            <KpiCard
              title="부정 감정 비율"
              value={`${negativeRatio}%`}
              description="SAD/ANXIOUS/ANGRY 합산"
              icon={Frown}
              valueClassName="text-[#6366f1]"
            />
            <KpiCard
              title="감정 다양성"
              value={`H = ${entropy}`}
              description="Shannon 엔트로피"
              icon={Activity}
            />
          </div>

          {areaData.length === 0 ? (
            <AnalyticsEmpty height={300} title="해당 기간 감정 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">감정 추이 — 100% Stacked Area</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    KcELECTRA emotion_tags / 각 날짜 합계 = 100%
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={areaData}
                      stackOffset="expand"
                      margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 8 }}
                        stroke="hsl(var(--muted-foreground))"
                        interval={Math.max(1, Math.floor(areaData.length / 8))}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => [`${(v * 100).toFixed(1)}%`, name]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                      {data.topEmotions.map((key, idx) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stackId="1"
                          stroke={colorFor(key, idx)}
                          fill={colorFor(key, idx)}
                          fillOpacity={0.75}
                          strokeWidth={0}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {data.topEmotions.map((key, idx) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: colorFor(key, idx) }} />
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">감정 카테고리 전체 분포</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      선택 기간 전체 emotion_tags 비율 합산
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
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
                            <Cell key={entry.key} fill={colorFor(entry.key, idx)} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, name: string) => [v.toLocaleString() + '건', name]}
                          contentStyle={TOOLTIP_STYLE}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">감정별 누적 빈도 막대</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">긍정/부정 색 구분</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={pieData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(v: number) => [`${v.toLocaleString()}건`, '빈도']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {pieData.map((entry, idx) => {
                            const upper = entry.key.toUpperCase();
                            const fill = NEGATIVE_KEYS.has(upper)
                              ? '#ef4444'
                              : POSITIVE_KEYS.has(upper)
                                ? '#10b981'
                                : colorFor(entry.key, idx);
                            return <Cell key={entry.key} fill={fill} fillOpacity={0.85} />;
                          })}
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
