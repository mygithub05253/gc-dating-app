'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import {
  BookOpen,
  Clock,
  Calendar,
  Moon,
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
} from 'recharts';
import toast from 'react-hot-toast';
import { useDiaryTimeHeatmap } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { DiaryTimeHeatmapResponse, HeatmapCell } from '@/types/analytics';

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
// BE는 dayOfWeek 0=일요일, 6=토요일 사용 (ISO standard)
// 표시는 월~일 순서로 매핑
const DAYS_DISPLAY = ['월', '화', '수', '목', '금', '토', '일'] as const;
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // 표시 순서 → BE dayOfWeek 매핑
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const BLUE_SCALE = ['#eff6ff', '#dbeafe', '#93c5fd', '#3b82f6', '#1e3a8a'] as const;

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function cellBgColor(count: number, max: number): string {
  if (count === 0 || max === 0) return BLUE_SCALE[0];
  const ratio = Math.min(count / max, 1);
  const segment = 1 / 4;
  const idx = Math.min(Math.floor(ratio / segment), 3);
  const t = (ratio - idx * segment) / segment;
  return interpolateColor(BLUE_SCALE[idx], BLUE_SCALE[idx + 1], t);
}

function cellTextColor(count: number, max: number): string {
  return count >= max * 0.55 ? '#ffffff' : '#374151';
}

// BE dayOfWeek(0=일~6=토) → 한국식 라벨 매핑
const DAY_LABEL_BY_INDEX = ['일', '월', '화', '수', '목', '금', '토'];

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryHeatmapPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [tooltip, setTooltip] = useState<{ day: string; hour: number; count: number } | null>(null);

  const { startDate, endDate } = periodToDateRange(period);
  const query = useDiaryTimeHeatmap({ startDate, endDate });
  const data: DiaryTimeHeatmapResponse | undefined = query.data;

  // BE cells → 7×24 매트릭스 lookup
  const cellMap = useMemo(() => {
    const m = new Map<string, number>();
    if (data) {
      data.cells.forEach((c: HeatmapCell) => {
        m.set(`${c.dayOfWeek}-${c.hour}`, c.count);
      });
    }
    return m;
  }, [data]);

  const maxCount = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, ...data.cells.map((c) => c.count));
  }, [data]);

  // 시간대별 합계
  const hourBarData = useMemo(() => {
    return HOURS.map((h) => {
      let sum = 0;
      for (let d = 0; d < 7; d++) sum += cellMap.get(`${d}-${h}`) ?? 0;
      return { hour: `${String(h).padStart(2, '0')}시`, count: sum };
    });
  }, [cellMap]);

  // 요일별 합계 (월~일 순)
  const dayBarData = useMemo(() => {
    return DAYS_DISPLAY.map((label, i) => {
      const beIdx = DAY_INDICES[i];
      let sum = 0;
      for (let h = 0; h < 24; h++) sum += cellMap.get(`${beIdx}-${h}`) ?? 0;
      return { day: label, count: sum };
    });
  }, [cellMap]);

  const totalCount = data?.totalDiaries ?? 0;
  const dailyAvg = Math.round(totalCount / 7);
  const peakHour = data ? `${String(data.peakHour).padStart(2, '0')}시` : '—';
  const peakDay = data ? `${DAY_LABEL_BY_INDEX[data.peakDayOfWeek]}요일` : '—';

  // 심야(0~5시) 비율
  const nightCount = useMemo(() => {
    let sum = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h <= 5; h++) sum += cellMap.get(`${d}-${h}`) ?? 0;
    }
    return sum;
  }, [cellMap]);
  const nightRatio = totalCount > 0 ? Math.round((nightCount / totalCount) * 100) : 0;

  // 시간대 그룹 통계 (BE: 글자수/품질 미제공 — 작성수/비율만 계산)
  const timeGroups = useMemo(() => {
    const groups = [
      { group: '새벽', range: '0~6시', start: 0, end: 5 },
      { group: '오전', range: '6~12시', start: 6, end: 11 },
      { group: '오후', range: '12~18시', start: 12, end: 17 },
      { group: '저녁', range: '18~22시', start: 18, end: 21 },
      { group: '심야', range: '22~24시', start: 22, end: 23 },
    ];
    const counts = groups.map((g) => {
      let count = 0;
      for (let d = 0; d < 7; d++) {
        for (let h = g.start; h <= g.end; h++) count += cellMap.get(`${d}-${h}`) ?? 0;
      }
      return { ...g, count };
    });
    const total = counts.reduce((s, r) => s + r.count, 0);
    return counts.map((r) => ({ ...r, ratio: total > 0 ? Math.round((r.count / total) * 100) : 0 }));
  }, [cellMap]);

  const handleDownload = () => {
    toast.success('히트맵 CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="일기 시간 히트맵"
        description="요일·시간대별 일기 작성 패턴"
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
          {/* KPI 4개 */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="일일 평균 작성 수"
              value={dailyAvg.toLocaleString()}
              description={`${period} 기간 일 평균`}
              icon={BookOpen}
              valueClassName="text-primary"
            />
            <KpiCard title="피크 시간대" value={peakHour} description="가장 많이 작성되는 시간" icon={Clock} />
            <KpiCard
              title="피크 요일"
              value={peakDay}
              description="가장 많이 작성되는 요일"
              icon={Calendar}
              valueClassName="text-[#10b981]"
            />
            <KpiCard
              title="심야 작성 비율"
              value={`${nightRatio}%`}
              description="0~6시 작성 비율"
              icon={Moon}
            />
          </div>

          {data.cells.length === 0 ? (
            <AnalyticsEmpty height={300} title="해당 기간 작성 데이터가 없습니다" />
          ) : (
            <>
              {/* 7×24 Heatmap */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">요일 × 시간대 작성 빈도 히트맵</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    행: 요일(월~일) / 열: 시간대(00~23시) / 색 강도: 작성 수 비례. 셀 hover 시 상세 정보 표시.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `36px repeat(24, minmax(28px, 1fr))` }}
                    >
                      <div />
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
                        >
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}

                      {DAYS_DISPLAY.map((dayLabel, displayIdx) => {
                        const beDayIdx = DAY_INDICES[displayIdx];
                        return (
                          <>
                            <div
                              key={`label-${displayIdx}`}
                              className="flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                            >
                              {dayLabel}
                            </div>
                            {HOURS.map((h) => {
                              const count = cellMap.get(`${beDayIdx}-${h}`) ?? 0;
                              const bg = cellBgColor(count, maxCount);
                              const fg = cellTextColor(count, maxCount);
                              return (
                                <div
                                  key={`${displayIdx}-${h}`}
                                  className="relative m-0.5 flex cursor-default items-center justify-center rounded text-[9px] font-mono tabular-nums transition-opacity hover:opacity-80"
                                  style={{
                                    backgroundColor: bg,
                                    color: fg,
                                    height: '28px',
                                    minWidth: '26px',
                                  }}
                                  onMouseEnter={() => setTooltip({ day: dayLabel, hour: h, count })}
                                  onMouseLeave={() => setTooltip(null)}
                                  title={`${dayLabel}요일 ${String(h).padStart(2, '0')}시 — ${count}건`}
                                >
                                  {count > 0 ? count : ''}
                                </div>
                              );
                            })}
                          </>
                        );
                      })}
                    </div>
                  </div>

                  {tooltip && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
                      <span className="font-medium text-foreground">{tooltip.day}요일</span>
                      <span className="text-muted-foreground">{String(tooltip.hour).padStart(2, '0')}:00</span>
                      <span className="text-primary font-bold">{tooltip.count}건</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>낮음</span>
                    <div
                      className="h-3 w-32 rounded"
                      style={{
                        background: 'linear-gradient(to right, #eff6ff, #dbeafe, #93c5fd, #3b82f6, #1e3a8a)',
                      }}
                    />
                    <span>높음</span>
                    <span className="ml-4 text-muted-foreground/60">최댓값: {maxCount}건</span>
                  </div>
                </CardContent>
              </Card>

              {/* 보조 차트 2개 */}
              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">시간대별 작성 수</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">00~23시 전체 요일 합산</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={hourBarData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          interval={2}
                        />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(v: number) => [`${v.toLocaleString()}건`, '작성 수']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="count" name="작성 수" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">요일별 작성 수</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">월~일 전체 시간 합산</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={dayBarData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          formatter={(v: number) => [`${v.toLocaleString()}건`, '작성 수']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="count" name="작성 수" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* 시간대 그룹 통계 (글자수/품질은 BE 미제공 — 작성수/비율만 표시) */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">시간대 그룹별 통계</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    새벽 / 오전 / 오후 / 저녁 / 심야 5개 그룹 — 작성 수·비율
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">시간대</TableHead>
                          <TableHead>범위</TableHead>
                          <TableHead className="text-right">작성 수</TableHead>
                          <TableHead className="text-right pr-4">비율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeGroups.map((row) => (
                          <TableRow key={row.group}>
                            <TableCell className="pl-4 font-medium text-sm">{row.group}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.range}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-sm">
                              {row.count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    width: `${row.ratio * 1.6}px`,
                                    backgroundColor: '#3b82f6',
                                    opacity: 0.7,
                                  }}
                                />
                                <span className="font-mono tabular-nums text-xs">{row.ratio}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
